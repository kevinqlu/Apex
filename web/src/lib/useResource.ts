import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../api/client';

export type Resource<T> =
  { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; data: T };

// Loads something from the API once, and can load it again. `fetcher` must be a stable
// function, such as one exported from api/. `replace` is for actions whose answer is the
// whole updated thing, so the screen shows exactly what the server now holds.
export function useResource<T>(fetcher: () => Promise<T>) {
  const [state, setState] = useState<Resource<T>>({ status: 'loading' });

  const reload = useCallback(() => {
    setState({ status: 'loading' });
    fetcher().then(
      (data) => setState({ status: 'ready', data }),
      (err) =>
        setState({
          status: 'error',
          message: err instanceof ApiError ? err.message : 'Something went wrong. Try again.',
        }),
    );
  }, [fetcher]);

  useEffect(reload, [reload]);

  const replace = useCallback((data: T) => setState({ status: 'ready', data }), []);

  return { state, reload, replace };
}
