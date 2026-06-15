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

  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
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
        } catch (error: any) {
          apiClient.clearToken();
          setState({
            isLoading: false,
            isAuthenticated: false,
            user: null,
            tenant: null,
            error: null,
          });
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
      apiClient.setToken(response.token);
      setState({
        isLoading: false,
        isAuthenticated: true,
        user: response.user,
        tenant: response.tenant,
        error: null,
      });
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Registration failed',
      }));
      throw error;
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      const response = await apiClient.login(email, password);
      apiClient.setToken(response.token);
      setState({
        isLoading: false,
        isAuthenticated: true,
        user: response.user,
        tenant: response.tenant,
        error: null,
      });
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Login failed',
      }));
      throw error;
    }
  };

  const logout = () => {
    apiClient.clearToken();
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
