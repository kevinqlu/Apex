import { useCallback, useEffect, useState } from 'react';
import { getLoads, type Load } from '../api/loads';
import { ApiError } from '../api/client';

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

type LoadsState =
  { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; loads: Load[] };

export function useLoads() {
  const [state, setState] = useState<LoadsState>({ status: 'loading' });

  const load = useCallback(() => {
    setState({ status: 'loading' });
    getLoads().then(
      ({ loads }) => setState({ status: 'ready', loads }),
      (err) =>
        setState({
          status: 'error',
          message: err instanceof ApiError ? err.message : 'Something went wrong. Try again.',
        }),
    );
  }, []);

  useEffect(load, [load]);
  return { state, reload: load };
}
