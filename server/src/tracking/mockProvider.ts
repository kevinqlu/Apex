import type { Load } from '../db/loads.js';
import { cityCoordinates, distanceMiles, type Coordinates } from './cities.js';
import type { Position, TrackingProvider } from './provider.js';

// The truck is never drawn exactly on a city, so it does not hide the city's marker.
const TRIP_START = 0.05;
const TRIP_END = 0.95;
const toRad = (deg: number) => (deg * Math.PI) / 180;

function bearingDeg(a: Coordinates, b: Coordinates): number {
  const dLng = toRad(b.lng - a.lng);
  const y = Math.sin(dLng) * Math.cos(toRad(b.lat));
  const x =
    Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) -
    Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(dLng);
  return Math.round(((Math.atan2(y, x) * 180) / Math.PI + 360) % 360);
}

// Position comes from the pickup and delivery times, so nothing is stored and a reseed resets it.
// `speedup` makes a demo visibly move: real driving is far too slow to see on a map in 30 seconds.
export class MockProvider implements TrackingProvider {
  readonly simulated = true;

  constructor(
    private readonly speedup = 1,
    private readonly startedAt = Date.now(),
  ) {}

  getPosition(load: Load, now = Date.now()): Position | null {
    if (load.status !== 'in_transit') return null;
    const from = cityCoordinates(load.origin);
    const to = cityCoordinates(load.destination);
    const tripMs = Date.parse(load.deliveryAt) - Date.parse(load.pickupAt);

    // Extra travel since the server started, on top of where the real clock puts the truck.
    const extra = tripMs > 0 ? ((now - this.startedAt) * (this.speedup - 1)) / tripMs : 0;
    // Past the destination the demo truck loops back to the start, so it is always moving.
    const span = TRIP_END - TRIP_START;
    const progress = TRIP_START + ((((load.progress + extra - TRIP_START) % span) + span) % span);

    const hours = tripMs / 3_600_000;
    return {
      lat: from.lat + (to.lat - from.lat) * progress,
      lng: from.lng + (to.lng - from.lng) * progress,
      headingDeg: bearingDeg(from, to),
      speedMph: hours > 0 ? Math.round(distanceMiles(from, to) / hours) : 0,
      updatedAt: new Date(now).toISOString(),
    };
  }
}
