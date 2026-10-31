import type { Load } from '../api/loads';

export const isDelivered = (load: Load) => load.status === 'delivered';

export function pickActiveLoad(loads: Load[]): Load | undefined {
  for (const status of ['in_transit', 'delayed', 'pending'] as const) {
    const match = loads.find((l) => l.status === status);
    if (match) return match;
  }
  return undefined;
}
