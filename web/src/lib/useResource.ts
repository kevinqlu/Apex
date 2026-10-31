import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../api/client';

export type Resource<T> =
  { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; data: T };

export function useResource<T>(fetchOnce: () => Promise<T>) {
  const [state, setState] = useState<Resource<T>>({ status: 'loading' });
  const fetcher = useRef(fetchOnce);

  const reload = useCallback(() => {
    setState({ status: 'loading' });
    fetcher.current().then(
      (data) => setState({ status: 'ready', data }),
      (err) =>
        setState({
          status: 'error',
          message: err instanceof ApiError ? err.message : 'Something went wrong. Try again.',
        }),
    );
  }, []);

  useEffect(reload, [reload]);

  const replace = useCallback((data: T) => setState({ status: 'ready', data }), []);

  return { state, reload, replace };
}
