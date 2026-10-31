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
  progress: number;
}

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

// The load a driver is working on now: on the road first, then delayed, then next up.
export function pickActiveLoad(loads: Load[]): Load | undefined {
  for (const status of ['in_transit', 'delayed', 'pending'] as const) {
    const match = loads.find((l) => l.status === status);
    if (match) return match;
  }
  return undefined;
}

export function listLoads(db: Db, driverId: string, now = Date.now()): Load[] {
  const rows = db
    .prepare('SELECT * FROM loads WHERE driver_id = ? ORDER BY pickup_at')
    .all(driverId) as LoadRow[];
  return rows.map((row) => toLoad(row, now));
}

// Ownership is in the query: another driver's load is not found.
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
