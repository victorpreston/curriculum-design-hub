import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { SessionUser } from '@hub/shared';
import { api, setUnauthenticatedHandler } from './api';

interface AuthState {
  user: SessionUser | null;
  checking: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    setUnauthenticatedHandler(() => setUser(null));
    api
      .me()
      .then(({ user: current }) => setUser(current))
      .catch(() => setUser(null))
      .finally(() => setChecking(false));
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { user: signedIn } = await api.login(email, password);
    setUser(signedIn);
  }, []);

  const signOut = useCallback(async () => {
    await api.logout();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, checking, signIn, signOut }),
    [user, checking, signIn, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const state = useContext(AuthContext);
  if (!state) throw new Error('useAuth must be used inside AuthProvider');
  return state;
}

export function useSignedInUser(): SessionUser {
  const { user } = useAuth();
  if (!user) throw new Error('useSignedInUser requires a signed-in user');
  return user;
}
