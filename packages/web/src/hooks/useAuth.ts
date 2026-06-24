import { useEffect, useState } from 'react';
import { apiClient } from '../lib/api';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  role: 'user' | 'tenant_admin' | 'platform_admin';
}

export interface AuthTenant {
  id: string;
  name: string;
  displayCurrency: string;
}

export interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: AuthUser | null;
  tenant: AuthTenant | null;
  error: string | null;
}

const initialState: AuthState = {
  isLoading: true,
  isAuthenticated: false,
  user: null,
  tenant: null,
  error: null,
};

export function useAuth() {
  const [state, setState] = useState<AuthState>(initialState);

  // Check if user is already logged in; attempt refresh if access token expired
  useEffect(() => {
    const checkAuth = async () => {
      // Phase 4: hydrate tokens from secure storage (no-op on web, reads Keychain on native)
      await apiClient.init();
      const token = apiClient.getToken();
      if (token) {
        try {
          const response = await apiClient.getMe();
          setState({
            isLoading: false,
            isAuthenticated: true,
            user: response.user,
            tenant: response.tenant,
            error: null,
          });
        } catch (error: unknown) {
          const status = (error as { status?: number }).status;
          if (status === 401 && apiClient.getRefreshToken()) {
            try {
              await apiClient.refreshToken();
              const me = await apiClient.getMe();
              setState({ isLoading: false, isAuthenticated: true, user: me.user, tenant: me.tenant, error: null });
              return;
            } catch {
              // Refresh failed — clear all auth state
            }
          }
          await apiClient.clearToken();
          setState({ isLoading: false, isAuthenticated: false, user: null, tenant: null, error: null });
        }
      } else {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    };

    checkAuth();
  }, []);

  const register = async (
    email: string,
    password: string,
    displayName: string,
    tenantName: string,
    displayCurrency: string
  ) => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      const response = await apiClient.register(email, password, displayName, tenantName, displayCurrency);
      // token + refreshToken already stored inside apiClient.register()
      setState({
        isLoading: false,
        isAuthenticated: true,
        user: response.user,
        tenant: response.tenant,
        error: null,
      });
    } catch (error: unknown) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: (error as Error).message || 'Registration failed',
      }));
      throw error;
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      const response = await apiClient.login(email, password);
      // token + refreshToken already stored inside apiClient.login()
      setState({
        isLoading: false,
        isAuthenticated: true,
        user: response.user,
        tenant: response.tenant,
        error: null,
      });
    } catch (error: unknown) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: (error as Error).message || 'Login failed',
      }));
      throw error;
    }
  };

  const logout = async () => {
    try {
      await apiClient.logout(); // revokes refresh token server-side + clears secure storage
    } catch {
      await apiClient.clearToken();
    }
    setState(initialState);
    setState((prev) => ({ ...prev, isLoading: false }));
  };

  return {
    ...state,
    register,
    login,
    logout,
  };
}
