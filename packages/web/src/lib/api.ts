const API_BASE_URL =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.DEV ? '' : 'http://localhost:5001');

export type TenantSyncResult = {
  tenantsSynced: number;
  inserted: number;
  updated: number;
  orphans: number;
  pruned: number;
  templatesRelinked: number;
};

export type PlatformReferenceCategory =
  | 'product_type'
  | 'unit'
  | 'rm_type'
  | 'printing_web'
  | 'ink_coating'
  | 'adhesive'
  | 'packaging'
  | 'product_subtype';

export type PlatformReferenceItemInput = {
  label: string;
  code?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type PlatformMasterMaterialInput = {
  key: string;
  name: string;
  type: 'substrate' | 'ink' | 'adhesive';
  solidPercent: number;
  density: number;
  costPerKgUsd: number;
  wastePercent?: number;
  isSolventBased?: boolean;
  substrateFamily?: string | null;
  substrateGrade?: string | null;
  hoover?: string | null;
  marketPriceUsd?: number | null;
  sortOrder?: number;
  externalId?: string | null;
  externalSource?: string | null;
};

export type PlatformMasterMaterialRow = PlatformMasterMaterialInput & {
  id: string;
  costingKey?: string | null;
};

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
    const writeMethods = new Set(['POST', 'PUT', 'PATCH']);
    const payload =
      body !== undefined ? body : writeMethods.has(method) ? {} : undefined;

    if (payload !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: payload !== undefined ? JSON.stringify(payload) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: response.statusText,
      }));
      const message = error.error || `API error: ${response.status}`;
      const err = new Error(message) as Error & { status?: number; details?: unknown };
      err.status = response.status;
      if (error.unresolvedLayers) err.details = error.unresolvedLayers;
      throw err;
    }

    // 204 No Content (e.g. DELETE) and empty bodies must not hit response.json()
    // — that throws on empty input. Parse defensively. (Deep Audit pass-4 P1)
    if (response.status === 204) {
      return undefined as T;
    }
    const text = await response.text();
    return (text ? JSON.parse(text) : undefined) as T;
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

  refreshToken() {
    return this.request<{ token: string }>('POST', '/api/v1/auth/refresh');
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
    return this.request<{ materials: any[]; count: number; sync: TenantSyncResult }>(
      'PUT',
      '/api/v1/platform/master-data/materials',
      materials
    );
  }

  getPlatformMasterDataMaterials() {
    return this.request<PlatformMasterMaterialRow[]>('GET', '/api/v1/platform/master-data/materials');
  }

  createPlatformMasterMaterial(material: PlatformMasterMaterialInput) {
    return this.request<{ material: PlatformMasterMaterialInput; sync: TenantSyncResult }>(
      'POST',
      '/api/v1/platform/master-data/materials',
      material
    );
  }

  updatePlatformMasterMaterial(id: string, material: Partial<PlatformMasterMaterialInput>) {
    return this.request<{ material: PlatformMasterMaterialInput; sync: TenantSyncResult }>(
      'PATCH',
      `/api/v1/platform/master-data/materials/${id}`,
      material
    );
  }

  deletePlatformMasterMaterial(id: string) {
    return this.request<{ ok: boolean; sync: TenantSyncResult }>(
      'DELETE',
      `/api/v1/platform/master-data/materials/${id}`
    );
  }

  getPlatformMasterDataReference() {
    return this.getMasterDataReference();
  }

  savePlatformReferenceCategory(
    category: PlatformReferenceCategory,
    items: PlatformReferenceItemInput[]
  ) {
    return this.request<{ items: unknown[]; sync: TenantSyncResult }>(
      'PUT',
      `/api/v1/platform/master-data/reference/${category}`,
      items
    );
  }

  syncMaterialsFromPlatform() {
    return this.request<TenantSyncResult & { totalMaterials?: number }>(
      'POST',
      '/api/v1/materials/sync-from-platform',
      {}
    );
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
    return this.request<{
      updated: number;
      skipped: number;
      errors: string[];
      changes: { material: string; family: string; old: number; new: number; source: string }[];
      sources: { family: string; resin: string; symbol: string | null; resinUsdPerKg: number; filmUsdPerKg: number }[];
      note: string;
    }>('POST', '/api/v1/materials/refresh-prices');
  }

  refreshMaterialsFromExcel(prune = false) {
    return this.request<{
      excelPath: string;
      seedPath: string;
      referencePath: string;
      substrateCount: number;
      inkCount: number;
      adhesiveCount: number;
      packagingCount: number;
      totalMaterials: number;
      tenantsSynced: number;
      inserted: number;
      updated: number;
      orphans: number;
      pruned: number;
      reference: { productTypes: number; units: number; rmTypes: number };
    }>('POST', '/api/v1/materials/refresh-from-excel', { prune });
  }

  getMasterDataReference() {
    return this.request<{
      productTypes: string[];
      productTypeRows?: Array<{ label: string; code: string }>;
      units: string[];
      rmTypes: string[];
      rmTypeRows?: Array<{ label: string; code: string }>;
      packaging: string[];
      inkCoating: string[];
      adhesive: string[];
      printingWebClasses?: Array<{
        label: string;
        code: string;
        inkSystem?: string | null;
        solidPercent?: number | null;
      }>;
      productTypeOptions: Array<{ label: string; value: 'roll' | 'sleeve' | 'pouch' }>;
      printingWebClassOptions: Array<{
        label: string;
        value: 'wide_web' | 'narrow_web';
        inkSystem: string | null;
        solidPercent: number | null;
        description: string;
      }>;
      unitOptions: Array<{ label: string; value: string }>;
      rmTypeOptions?: Array<{ label: string; code: string }>;
    }>('GET', '/api/v1/master-data/reference');
  }

  pruneOrphanSubstrates() {
    return this.request<{ pruned: number }>('POST', '/api/v1/materials/prune-orphans');
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

  createTemplate(name: string, estimateId: string) {
    return this.request<any>('POST', '/api/v1/templates', { name, estimateId });
  }

  getEstimateProposals(estimateId: string) {
    return this.request<Array<{
      id: string;
      estimateId: string;
      pdfPath: string | null;
      validUntil: string | null;
      sentAt: string | null;
      createdAt: string | null;
    }>>('GET', `/api/v1/estimates/${estimateId}/proposals`);
  }

  async getStoredProposalPdf(proposalId: string) {
    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE_URL}/api/v1/proposals/${proposalId}/pdf`, {
      method: 'GET',
      headers,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `API error: ${res.status}`);
    }

    return res.blob();
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

  updateTemplate(id: string, data: Record<string, unknown>) {
    return this.request<any>('PATCH', `/api/v1/templates/${id}`, data);
  }

  deleteTemplate(id: string) {
    return this.request<{ ok: boolean; deactivated?: boolean; deleted?: boolean }>(
      'DELETE',
      `/api/v1/templates/${id}`
    );
  }

  instantiateTemplate(id: string, data: {
    customerId?: string;
    jobName?: string;
    orderQuantityKg?: number;
    orderQuantityUnit?: string;
  }) {
    return this.request<any>('POST', `/api/v1/templates/${id}/instantiate`, data);
  }
}

export const apiClient = new ApiClient();
