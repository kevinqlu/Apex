import type { Load } from '../api/loads';

export const isDelivered = (load: Load) => load.status === 'delivered';

// The load to show first: one moving, then one running late, then the next one waiting.
// The server returns loads ordered by pickup time, so the first match is the soonest.
export function pickActiveLoad(loads: Load[]): Load | undefined {
  for (const status of ['in_transit', 'delayed', 'pending'] as const) {
    const match = loads.find((l) => l.status === status);
    if (match) return match;
  }
  return undefined;
}
