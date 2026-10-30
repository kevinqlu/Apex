import type { Db } from './index.js';

export type LoadStatus = 'pending' | 'in_transit' | 'delivered' | 'delayed';

interface LoadRow {
  id: string;
  status: LoadStatus;
  origin_city: string;
  origin_state: string;
  origin_facility: string;
  dest_city: string;
  dest_state: string;
  dest_facility: string;
  cargo_description: string;
  weight_lb: number;
  equipment: string;
  pickup_at: string;
  delivery_at: string;
  delay_note: string | null;
  reference: string | null;
}

interface Place {
  city: string;
  state: string;
  facility: string;
}

export interface Load {
  id: string;
  status: LoadStatus;
  origin: Place;
  destination: Place;
  cargoDescription: string;
  weightLb: number;
  equipment: string;
  pickupAt: string;
  deliveryAt: string;
  delayNote: string | null;
  reference: string | null;
  // How far along the route the truck is, from 0 to 1, for the route strip.
  progress: number;
}

// Only a load in transit has moved. A late pickup is still at the origin, and a delivered
// load is at the destination. In transit, the position follows the clock between pickup
// and delivery, kept off the ends so the truck marker never sits on a city name.
export function progressFor(row: LoadRow, now: number): number {
  if (row.status === 'delivered') return 1;
  if (row.status !== 'in_transit') return 0;
  const start = Date.parse(row.pickup_at);
  const end = Date.parse(row.delivery_at);
  if (end <= start) return 0.5;
  return Math.min(0.95, Math.max(0.05, (now - start) / (end - start)));
}

function toLoad(row: LoadRow, now: number): Load {
  return {
    id: row.id,
    status: row.status,
    origin: { city: row.origin_city, state: row.origin_state, facility: row.origin_facility },
    destination: { city: row.dest_city, state: row.dest_state, facility: row.dest_facility },
    cargoDescription: row.cargo_description,
    weightLb: row.weight_lb,
    equipment: row.equipment,
    pickupAt: row.pickup_at,
    deliveryAt: row.delivery_at,
    delayNote: row.delay_note,
    reference: row.reference,
    progress: progressFor(row, now),
  };
}

export function listLoads(db: Db, driverId: string, now = Date.now()): Load[] {
  const rows = db
    .prepare('SELECT * FROM loads WHERE driver_id = ? ORDER BY pickup_at')
    .all(driverId) as LoadRow[];
  return rows.map((row) => toLoad(row, now));
}

// Ownership is part of the query. A load that belongs to someone else is simply not found,
// so the response cannot confirm that the ID exists.
export function findLoad(
  db: Db,
  driverId: string,
  loadId: string,
  now = Date.now(),
): Load | undefined {
  const row = db
    .prepare('SELECT * FROM loads WHERE id = ? AND driver_id = ?')
    .get(loadId, driverId) as LoadRow | undefined;
  return row && toLoad(row, now);
}
