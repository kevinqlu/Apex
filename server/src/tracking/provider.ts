import type { Load } from '../db/loads.js';

export interface Position {
  lat: number;
  lng: number;
  headingDeg: number;
  speedMph: number;
  updatedAt: string;
}

// The seam where a real telematics source plugs in. The route and the UI only know this shape.
export interface TrackingProvider {
  // True when positions are made up, so the screen can say so.
  readonly simulated: boolean;
  // Null when the truck is not on the road (not picked up yet, or delivered).
  getPosition(load: Load, now?: number): Position | null;
}
