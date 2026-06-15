const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export class ApiClient {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  getToken() {
    if (!this.token) {
      this.token = localStorage.getItem('auth_token');
    }
    return this.token;
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: response.statusText,
      }));
      throw new Error(error.error || `API error: ${response.status}`);
    }

    return response.json();
  }

  // Auth
  register(email: string, password: string, displayName: string, tenantName: string) {
    return this.request<{
      token: string;
      user: { id: string; email: string; displayName: string; role: string };
      tenant: { id: string; name: string };
    }>('POST', '/api/v1/auth/register', {
      email,
      password,
      displayName,
      tenantName,
      tenantType: 'individual',
      displayCurrency: 'AED',
    });
  }

  login(email: string, password: string) {
    return this.request<{
      token: string;
      user: { id: string; email: string; displayName: string; role: string };
      tenant: { id: string; name: string; displayCurrency: string };
    }>('POST', '/api/v1/auth/login', {
      email,
      password,
    });
  }

  getMe() {
    return this.request<{
      user: { id: string; email: string; displayName: string; role: string };
      tenant: { id: string; name: string; displayCurrency: string };
    }>('GET', '/api/v1/auth/me');
  }

  // Materials
  getMaterials() {
    return this.request<any[]>('GET', '/api/v1/materials');
  }

  createMaterial(material: any) {
    return this.request('POST', '/api/v1/materials', material);
  }

  updateMaterial(id: string, material: any) {
    return this.request(`PATCH`, `/api/v1/materials/${id}`, material);
  }

  deleteMaterial(id: string) {
    return this.request('DELETE', `/api/v1/materials/${id}`);
  }

  // Estimates
  getEstimates() {
    return this.request<any[]>('GET', '/api/v1/estimates');
  }

  createEstimate(estimate: any) {
    return this.request<any>('POST', '/api/v1/estimates', estimate);
  }

  calculateEstimate(id: string) {
    return this.request<any>('POST', `/api/v1/estimates/${id}/calculate`);
  }
}

export const apiClient = new ApiClient();
