import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import * as authApi from '../api/auth';
import { setUnauthorizedHandler } from '../api/client';

type AuthState =
  | { status: 'loading' }
  | { status: 'signed-out'; notice?: string }
  | { status: 'signed-in'; driver: authApi.Driver };

interface AuthContextValue {
  state: AuthState;
  signIn: (driverId: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  // A refresh keeps you signed in because the session cookie is still valid.
  useEffect(() => {
    authApi.getMe().then(
      ({ driver }) => setState({ status: 'signed-in', driver }),
      () => setState({ status: 'signed-out' }),
    );
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() =>
      setState({ status: 'signed-out', notice: 'Your session expired. Sign in again.' }),
    );
    return () => setUnauthorizedHandler(undefined);
  }, []);

  const signIn = useCallback(async (driverId: string, password: string) => {
    const { driver } = await authApi.login(driverId, password);
    setState({ status: 'signed-in', driver });
  }, []);

  const signOut = useCallback(async () => {
    // Leave the screen even if the server cannot be reached.
    await authApi.logout().catch(() => undefined);
    setState({ status: 'signed-out' });
  }, []);

  const value = useMemo(() => ({ state, signIn, signOut }), [state, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
