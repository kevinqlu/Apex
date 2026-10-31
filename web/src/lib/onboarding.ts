import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../api/client';
import { getOnboarding, type Onboarding } from '../api/onboarding';

type OnboardingState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; onboarding: Onboarding };

export function useOnboarding() {
  const [state, setState] = useState<OnboardingState>({ status: 'loading' });

  const load = useCallback(() => {
    setState({ status: 'loading' });
    getOnboarding().then(
      (onboarding) => setState({ status: 'ready', onboarding }),
      (err) =>
        setState({
          status: 'error',
          message: err instanceof ApiError ? err.message : 'Something went wrong. Try again.',
        }),
    );
  }, []);

  useEffect(load, [load]);

  // Each action answers with the full checklist, so the screen shows what the server holds.
  const replace = useCallback(
    (onboarding: Onboarding) => setState({ status: 'ready', onboarding }),
    [],
  );

  return { state, reload: load, replace };
}
