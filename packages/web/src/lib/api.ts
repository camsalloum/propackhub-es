import { Capacitor } from '@capacitor/core';
import { tokenStore } from './tokenStore';

/**
 * API base URL resolver (Phase 4 / M5).
 *
 * - Dev web:        '' (relative, proxied by Vite)
 * - Prod web:       VITE_API_BASE_URL env (or empty → same origin)
 * - Native iOS/Android: VITE_API_BASE_URL must be set to the deployed API host
 *   (e.g. https://api.propackhub.com) — relative URLs don't work on device.
 *
 * Build: set VITE_API_BASE_URL in .env.production (do not commit secrets).
 */
function resolveApiBase(): string {
  // Explicit override always wins (CI, staging, production)
  const envUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (envUrl) return envUrl.replace(/\/$/, '');

  // On a native Capacitor platform relative URLs don't resolve — warn loudly
  if (Capacitor.isNativePlatform()) {
    console.warn(
      '[API] Running on native platform without VITE_API_BASE_URL set. ' +
      'Set VITE_API_BASE_URL=https://your-api-host in .env.production before building.'
    );
    return '';
  }

  // Dev web: empty string → same-origin / Vite proxy
  return import.meta.env.DEV ? '' : '';
}

const API_BASE_URL = resolveApiBase();

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
  private refreshTokenValue: string | null = null;

  /** Call once on app startup to hydrate tokens from secure storage. */
  async init(): Promise<void> {
    this.token = await tokenStore.getAccessToken();
    this.refreshTokenValue = await tokenStore.getRefreshToken();
  }

  async setToken(token: string) {
    this.token = token;
    await tokenStore.setAccessToken(token);
  }

  getToken() {
    // Returns in-memory cache (hydrated via init() or setToken())
    // Falls back to localStorage synchronously on web for backward compat
    if (!this.token && !Capacitor.isNativePlatform()) {
      this.token = localStorage.getItem('auth_token');
    }
    return this.token;
  }

  async clearToken() {
    this.token = null;
    this.refreshTokenValue = null;
    await tokenStore.clear();
  }

  async setRefreshToken(token: string) {
    this.refreshTokenValue = token;
    await tokenStore.setRefreshToken(token);
  }

  getRefreshToken() {
    if (!this.refreshTokenValue && !Capacitor.isNativePlatform()) {
      this.refreshTokenValue = localStorage.getItem('refresh_token');
    }
    return this.refreshTokenValue;
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

    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}${path}`, {
        method,
        headers,
        body: payload !== undefined ? JSON.stringify(payload) : undefined,
      });
    } catch (networkErr) {
      // BUG-12: typed offline/network error so mobile client can distinguish it
      const err = new Error('Network request failed — check your connection') as Error & {
        status?: number;
        code?: string;
      };
      err.status = 0;
      err.code = 'NETWORK';
      throw err;
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: response.statusText,
      }));
      // Support both legacy `{ error: 'string' }` and new envelope `{ error: { code, message } }`
      const envelope = error?.error;
      const message =
        typeof envelope === 'object' && envelope !== null
          ? (envelope as { message?: string }).message ?? response.statusText
          : typeof envelope === 'string'
            ? envelope
            : `API error: ${response.status}`;
      const code =
        typeof envelope === 'object' && envelope !== null
          ? (envelope as { code?: string }).code
          : undefined;

      const err = new Error(message) as Error & {
        status?: number;
        code?: string;
        details?: unknown;
      };
      err.status = response.status;
      if (code) err.code = code;
      if ((error as { unresolvedLayers?: unknown })?.unresolvedLayers) {
        err.details = (error as { unresolvedLayers: unknown }).unresolvedLayers;
      }
      throw err;
    }

    // 204 No Content (e.g. DELETE) and empty bodies must not hit response.json()
    if (response.status === 204) {
      return undefined as T;
    }
    const text = await response.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }

  // Auth
  async register(email: string, password: string, displayName: string, tenantName: string, displayCurrency: string) {
    const res = await this.request<{
      token: string;
      refreshToken: string;
      user: { id: string; email: string; displayName: string; role: 'user' | 'tenant_admin' | 'platform_admin' };
      tenant: { id: string; name: string; displayCurrency: string };
    }>('POST', '/api/v1/auth/register', {
      email, password, displayName, tenantName, tenantType: 'individual', displayCurrency,
    });
    await this.setToken(res.token);
    if (res.refreshToken) await this.setRefreshToken(res.refreshToken);
    return res;
  }

  async login(email: string, password: string) {
    const res = await this.request<{
      token: string;
      refreshToken: string;
      user: { id: string; email: string; displayName: string; role: 'user' | 'tenant_admin' | 'platform_admin' };
      tenant: { id: string; name: string; displayCurrency: string };
    }>('POST', '/api/v1/auth/login', { email, password });
    await this.setToken(res.token);
    if (res.refreshToken) await this.setRefreshToken(res.refreshToken);
    return res;
  }

  async refreshToken() {
    const rt = this.getRefreshToken();
    if (!rt) throw new Error('No refresh token');
    const res = await this.request<{ token: string; refreshToken: string }>(
      'POST', '/api/v1/auth/refresh', { refreshToken: rt }
    );
    await this.setToken(res.token);
    if (res.refreshToken) await this.setRefreshToken(res.refreshToken);
    return res;
  }

  async logout() {
    const rt = this.getRefreshToken();
    await this.request<void>('POST', '/api/v1/auth/logout', { refreshToken: rt ?? undefined });
    await this.clearToken();
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
    return this.request<{ items: any[]; total: number; limit: number; offset: number } | any[]>(
      'GET', '/api/v1/materials'
    ).then(res => {
      if (res && !Array.isArray(res) && 'items' in res) return res.items;
      return res as any[];
    });
  }

  // Customers
  getCustomers() {
    return this.request<{ items: any[]; total: number; limit: number; offset: number } | any[]>(
      'GET', '/api/v1/customers'
    ).then(res => {
      if (res && !Array.isArray(res) && 'items' in res) return res.items;
      return res as any[];
    });
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
    return this.request<{ items: any[]; total: number; limit: number; offset: number } | any[]>(
      'GET', '/api/v1/estimates'
    ).then(res => {
      // Support both paginated { items } and legacy bare array
      if (res && !Array.isArray(res) && 'items' in res) return res.items;
      return res as any[];
    });
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

  createTemplateFromDefinition(data: {
    name: string;
    productType: 'roll' | 'sleeve' | 'pouch';
    materialClass: 'PE' | 'Non PE';
    structureTier: 'Mono' | 'Duplex' | 'Triplex' | 'Quadriplex';
    printMode: 'Plain' | 'Printed';
    defaultLayers: Array<{
      layer_order: number;
      layer_type: 'substrate' | 'ink' | 'adhesive';
      materialId?: string | null;
      default_micron: number;
    }>;
    defaultProcesses?: Array<{ process_key: string; enabled: boolean }>;
  }) {
    return this.request<any>('POST', '/api/v1/templates', { source: 'fromDefinition', ...data });
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
