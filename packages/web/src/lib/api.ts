const API_BASE_URL =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.DEV ? '' : 'http://localhost:5001');

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
    const headers: Record<string, string> = {};

    // Only set Content-Type if there's a body
    if (body) {
      headers['Content-Type'] = 'application/json';
    }

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
  register(email: string, password: string, displayName: string, tenantName: string, displayCurrency: string) {
    return this.request<{
      token: string;
      user: { id: string; email: string; displayName: string; role: 'user' | 'tenant_admin' | 'platform_admin' };
      tenant: { id: string; name: string; displayCurrency: string };
    }>('POST', '/api/v1/auth/register', {
      email,
      password,
      displayName,
      tenantName,
      tenantType: 'individual',
      displayCurrency,
    });
  }

  login(email: string, password: string) {
    return this.request<{
      token: string;
      user: { id: string; email: string; displayName: string; role: 'user' | 'tenant_admin' | 'platform_admin' };
      tenant: { id: string; name: string; displayCurrency: string };
    }>('POST', '/api/v1/auth/login', {
      email,
      password,
    });
  }

  getMe() {
    return this.request<{
      user: {
        id: string;
        email: string;
        displayName: string;
        role: 'user' | 'tenant_admin' | 'platform_admin';
        visibilityProfile: Record<string, boolean>;
      };
      tenant: { id: string; name: string; displayCurrency: string };
    }>('GET', '/api/v1/auth/me');
  }

  getPebiSsoUrl() {
    return this.request<{ enabled: boolean; url: string | null }>('GET', '/api/v1/auth/sso/pebi');
  }

  getMasterMaterials() {
    return this.request<any[]>('GET', '/api/v1/platform/master-materials');
  }

  updateMasterMaterials(materials: any[]) {
    return this.request<{ ok: boolean; count: number }>('PUT', '/api/v1/platform/master-materials', materials);
  }

  // Materials
  getMaterials() {
    return this.request<any[]>('GET', '/api/v1/materials');
  }

  // Customers
  getCustomers() {
    return this.request<any[]>('GET', '/api/v1/customers');
  }

  autocompleteCustomers(q: string) {
    return this.request<Array<{ id: string; companyName: string; contactName?: string }>>(
      'GET',
      `/api/v1/customers/autocomplete?q=${encodeURIComponent(q)}`
    );
  }

  getCustomer(id: string) {
    return this.request<any>('GET', `/api/v1/customers/${id}`);
  }

  getCustomerEstimates(customerId: string) {
    return this.request<any[]>(`GET`, `/api/v1/customers/${customerId}/estimates`);
  }

  createCustomer(customer: any) {
    return this.request('POST', '/api/v1/customers', customer);
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

  refreshMaterialPrices() {
    return this.request<{ updated: number; errors: string[]; changes: any[] }>('POST', '/api/v1/materials/refresh-prices');
  }

  // Estimates
  getEstimates() {
    return this.request<any[]>('GET', '/api/v1/estimates');
  }

  getDashboardSummary() {
    return this.request<{
      estimatesThisMonth: number;
      drafts: number;
      sent: number;
      won: number;
      recent: any[];
      expiringProposals: any[];
      quotationValidDays: number;
    }>('GET', '/api/v1/dashboard/summary');
  }

  getEstimate(id: string) {
    return this.request<any>('GET', `/api/v1/estimates/${id}`);
  }

  createEstimate(estimate: any) {
    return this.request<any>('POST', '/api/v1/estimates', estimate);
  }

  updateEstimate(id: string, updates: any) {
    return this.request<any>('PATCH', `/api/v1/estimates/${id}`, updates);
  }

  deleteEstimate(id: string) {
    return this.request('DELETE', `/api/v1/estimates/${id}`);
  }

  calculateEstimate(id: string) {
    return this.request<any>('POST', `/api/v1/estimates/${id}/calculate`);
  }

  requoteEstimate(id: string) {
    return this.request<any>('POST', `/api/v1/estimates/${id}/requote`);
  }

  duplicateEstimate(id: string) {
    return this.request<any>('POST', `/api/v1/estimates/${id}/duplicate`);
  }

  getSupportedCurrencies(q?: string) {
    const qs = q ? `?q=${encodeURIComponent(q)}` : '';
    return this.request<Array<{ code: string; name: string }>>('GET', `/api/v1/settings/currency/supported${qs}`);
  }

  getCategories() {
    return this.request<any[]>('GET', '/api/v1/categories');
  }

  getSlabTemplates() {
    return this.request<any[]>('GET', '/api/v1/settings/slab-templates');
  }

  getMyTemplates() {
    return this.request<any[]>('GET', '/api/v1/templates?standard_only=false');
  }

  async getProposalPdf(id: string) {
    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE_URL}/api/v1/estimates/${id}/proposal-pdf`, {
      method: 'GET',
      headers,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `API error: ${res.status}`);
    }

    return res.blob();
  }

  // Settings
  getSettings() {
    return this.request<any>('GET', '/api/v1/settings');
  }

  updateSettings(payload: any) {
    return this.request<any>('PATCH', '/api/v1/settings', payload);
  }

  refreshFx() {
    return this.request<{ exchangeRateUsdToDisplay: number }>('POST', '/api/v1/settings/refresh-fx');
  }

  // Users & Visibility
  getUsers() {
    return this.request<any>('GET', '/api/v1/users');
  }

  updateUserVisibility(userId: string, visibilityProfile: Record<string, boolean>) {
    return this.request<any>('PATCH', `/api/v1/users/${userId}/visibility`, { visibilityProfile });
  }

  getVisibilityPresets() {
    return this.request<Record<string, { name: string; profile: Record<string, boolean> }>>('GET', '/api/v1/visibility-presets');
  }

  // Templates
  getTemplates(standardOnly = true) {
    const qs = standardOnly ? '' : '?standard_only=false';
    return this.request<any[]>('GET', `/api/v1/templates${qs}`);
  }

  getTemplate(id: string) {
    return this.request<any>('GET', `/api/v1/templates/${id}`);
  }

  instantiateTemplate(id: string, data: { customerId?: string; jobName?: string }) {
    return this.request<any>('POST', `/api/v1/templates/${id}/instantiate`, data);
  }
}

export const apiClient = new ApiClient();
