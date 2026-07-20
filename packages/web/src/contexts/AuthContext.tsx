import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { apiClient } from '../lib/api';
import type { TenantCustomerAccess } from '../lib/tenantCustomerAccess';
import type { TenantCatalogAccess } from '../lib/tenantCatalogAccess';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  role: 'user' | 'tenant_admin' | 'platform_admin';
  pricingMethod?: 'markup' | 'margin_per_kg';
}

export interface AuthTenant {
  id: string;
  name: string;
  type: 'individual' | 'company';
  displayCurrency: string;
  operatingCostMethod?: 'process_per_kg' | 'markup_over_rm' | 'fixed_per_group';
  customerAccess?: TenantCustomerAccess;
  catalogAccess?: TenantCatalogAccess;
}

type AuthContextValue = {
  isLoading: boolean;
  isAuthenticated: boolean;
  authReady: boolean;
  user: AuthUser | null;
  tenant: AuthTenant | null;
  error: string | null;
  register: (
    email: string,
    password: string,
    displayName: string,
    tenantName: string,
    displayCurrency: string
  ) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function establishSession(): Promise<{ user: AuthUser; tenant: AuthTenant }> {
  const response = await apiClient.getMe();
  return { user: response.user, tenant: response.tenant };
}

async function restoreSession(): Promise<{ user: AuthUser; tenant: AuthTenant } | null> {
  const refresh = apiClient.getRefreshToken();
  const token = apiClient.getToken();

  if (!token && !refresh) return null;

  try {
    if (!token && refresh) {
      await apiClient.ensureRefreshed();
    }
    return await establishSession();
  } catch {
    if (!refresh) return null;
    try {
      await apiClient.ensureRefreshed();
      return await establishSession();
    } catch {
      return null;
    }
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [tenant, setTenant] = useState<AuthTenant | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient.onAuthFailure = () => {
      setAuthReady(false);
      setIsAuthenticated(false);
      setUser(null);
      setTenant(null);
      setIsLoading(false);
      setError(null);
    };

    void (async () => {
      try {
        await apiClient.init();
        const fromRedirect = await apiClient.applyAuthRedirectFromUrl();
        if (fromRedirect) {
          const session = await establishSession();
          setUser(session.user);
          setTenant(session.tenant);
          setIsAuthenticated(true);
          setAuthReady(true);
          return;
        }

        const session = await restoreSession();
        if (session) {
          setUser(session.user);
          setTenant(session.tenant);
          setIsAuthenticated(true);
          setAuthReady(true);
        } else {
          await apiClient.clearToken();
        }
      } catch {
        await apiClient.clearToken();
      } finally {
        setIsLoading(false);
      }
    })();

    return () => {
      apiClient.onAuthFailure = null;
    };
  }, []);

  const register = useCallback(
    async (
      email: string,
      password: string,
      displayName: string,
      tenantName: string,
      displayCurrency: string
    ) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiClient.register(
          email,
          password,
          displayName,
          tenantName,
          displayCurrency
        );
        setUser(response.user);
        setTenant(response.tenant);
        setIsAuthenticated(true);
        setAuthReady(true);
      } catch (err: unknown) {
        setError((err as Error).message || 'Registration failed');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.login(email, password);
      setUser(response.user);
      setTenant(response.tenant);
      setIsAuthenticated(true);
      setAuthReady(true);
    } catch (err: unknown) {
      setError((err as Error).message || 'Login failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiClient.logout();
    } catch {
      await apiClient.clearToken();
    }
    setAuthReady(false);
    setIsAuthenticated(false);
    setUser(null);
    setTenant(null);
    setIsLoading(false);
    setError(null);
  }, []);

  const value = useMemo(
    () => ({
      isLoading,
      isAuthenticated,
      authReady,
      user,
      tenant,
      error,
      register,
      login,
      logout,
    }),
    [isLoading, isAuthenticated, authReady, user, tenant, error, register, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
