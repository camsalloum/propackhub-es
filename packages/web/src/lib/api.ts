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

/** Order-quantity unit basis (mirrors engine UnitBasis). */
export type UnitBasis = 'kg' | 'pieces' | 'sqm' | 'lm';

export type UnitRow = {
  label: string;
  code: string;
  basis: UnitBasis;
  multiplier: number;
  /** When true, the multiplier is entered per-estimate (e.g. a roll's linear-metre length). */
  variableMultiplier?: boolean;
};

/** Shape returned by both the tenant (`/master-data/reference`) and platform reference endpoints. */
export type MasterDataReferencePayload = {
  productTypes: string[];
  productTypeRows?: Array<{ label: string; code: string }>;
  units: string[];
  unitRows?: UnitRow[];
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
  productSubtypeRows?: Array<{ label: string; code: string; parent?: string }>;
  processRows?: Array<{
    label: string;
    code: string;
    description?: string;
    costPerHour?: number;
    speedBasis?: string;
    speedValue?: number;
    setupHours?: number;
    costPerKgUsd?: number;
  }>;
  costingDefaults?: { cleaningSolventKgPerJob?: number };
  /** Platform-wide waste bands (single source of truth for all estimates). */
  wasteBands?: Array<{ minKg: number; maxKg: number | null; wastePercent: number }>;
  productTypeOptions: Array<{ label: string; value: string }>;
  printingWebClassOptions: Array<{
    label: string;
    value: 'wide_web' | 'narrow_web';
    inkSystem: string | null;
    solidPercent: number | null;
    description: string;
  }>;
  unitOptions: Array<{ label: string; value: string; basis?: 'kg' | 'pieces' | 'sqm' | 'lm' }>;
  rmTypeOptions?: Array<{ label: string; code: string }>;
  productSubtypeOptions?: Array<{ label: string; code: string; parent: string }>;
  processOptions?: Array<{ label: string; code: string; description: string }>;
};

export type PlatformMasterMaterialInput = {
  key: string;
  name: string;
  type: 'substrate' | 'ink' | 'adhesive' | 'solvent' | 'accessory';
  solidPercent: number;
  density: number;
  costPerKgUsd: number;
  /** Stored liquid price — avoids round-trip floating-point loss */
  liquidCostUsd?: number | null;
  wastePercent?: number;
  isSolventBased?: boolean;
  substrateFamily?: string | null;
  substrateGrade?: string | null;
  hoover?: string | null;
  marketPriceUsd?: number | null;
  sortOrder?: number;
  externalId?: string | null;
  externalSource?: string | null;
  laminationRecipe?: Record<string, unknown> | null;
  // Accessory pricing (type='accessory').
  accessoryKind?: 'zipper' | 'spout' | 'valve' | 'handle' | 'window' | null;
  costPerMeterUsd?: number | null;
  costPerPieceUsd?: number | null;
  weightGramPerMeter?: number | null;
  weightGramPerPiece?: number | null;
};

export type PlatformMasterMaterialRow = PlatformMasterMaterialInput & {
  id: string;
  costingKey?: string | null;
  /** UI-only: liquid ink price entered by user. costPerKgUsd = liquidCostUsd / (solidPercent/100) */
  liquidCostUsd?: number | null;
};

/**
 * Return shape of any platform-templates admin endpoint that mirrors a row
 * plus live-sync telemetry. Callers (e.g. `TemplateBuilder`) cast the row
 * part back to their template type, and read the telemetry off the rest.
 */
type PlatformTemplateSync = {
  syncedTenants: number;
  deactivatedTenants: number;
  inserted: number;
};

export class ApiClient {
  private token: string | null = null;
  private refreshTokenValue: string | null = null;
  /** Single-flight guard so concurrent 401s trigger only one refresh. */
  private refreshPromise: Promise<void> | null = null;
  /** Optional hook the app can set to react to an unrecoverable auth failure. */
  onAuthFailure: (() => void) | null = null;

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
    body?: unknown,
    isRetry = false
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
        // Never serve stale estimate/material GETs from the HTTP cache after PATCH.
        cache: 'no-store',
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
      // Access tokens are short-lived (30 min). On a 401, transparently refresh
      // once and replay the original request so long-open sessions don't fail.
      // Skip for auth endpoints themselves (a 401 there is a real credential
      // failure) and for requests we've already retried.
      const isAuthEndpoint = path.includes('/api/v1/auth/');
      if (response.status === 401 && !isRetry && !isAuthEndpoint && this.getRefreshToken()) {
        try {
          await this.ensureRefreshed();
        } catch {
          await this.clearToken();
          this.onAuthFailure?.();
          const authErr = new Error('Session expired — please sign in again') as Error & {
            status?: number;
            code?: string;
          };
          authErr.status = 401;
          authErr.code = 'AUTH_EXPIRED';
          throw authErr;
        }
        return this.request<T>(method, path, body, true);
      }

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
      // Surface a server-provided `detail` (root-cause message) so 500s aren't opaque.
      if ((error as { detail?: unknown })?.detail) {
        err.details = (error as { detail: unknown }).detail;
        err.message = `${message}: ${(error as { detail: unknown }).detail}`;
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
      tenant: { id: string; name: string; type: 'individual' | 'company'; displayCurrency: string };
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
      tenant: { id: string; name: string; type: 'individual' | 'company'; displayCurrency: string };
    }>('POST', '/api/v1/auth/login', { email, password });
    await this.setToken(res.token);
    if (res.refreshToken) await this.setRefreshToken(res.refreshToken);
    return res;
  }

  /**
   * Single-flight refresh: concurrent callers share one in-flight refresh so we
   * never fire multiple /auth/refresh calls (which would rotate the refresh
   * token underneath each other and fail).
   */
  private async ensureRefreshed(): Promise<void> {
    if (!this.refreshPromise) {
      this.refreshPromise = this.refreshToken()
        .then(() => undefined)
        .finally(() => {
          this.refreshPromise = null;
        });
    }
    return this.refreshPromise;
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
      tenant: { id: string; name: string; type: 'individual' | 'company'; displayCurrency: string };
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

  updateCostingDefaults(cleaningSolventKgPerJob: number) {
    return this.request<{ cleaningSolventKgPerJob: number }>(
      'PATCH',
      '/api/v1/platform/master-data/costing-defaults',
      { cleaningSolventKgPerJob }
    );
  }

  getPlatformWasteBands() {
    return this.request<{ wasteBands: Array<{ minKg: number; maxKg: number | null; wastePercent: number }> }>(
      'GET',
      '/api/v1/platform/master-data/waste-bands'
    );
  }

  updatePlatformWasteBands(wasteBands: Array<{ minKg: number; maxKg: number | null; wastePercent: number }>) {
    return this.request<{ wasteBands: Array<{ minKg: number; maxKg: number | null; wastePercent: number }> }>(
      'PUT',
      '/api/v1/platform/master-data/waste-bands',
      { wasteBands }
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
    // Admin edits the PLATFORM catalog directly (owner defaults), not the
    // tenant-merged view.
    return this.request<MasterDataReferencePayload & { masterDataVersion?: number }>(
      'GET',
      '/api/v1/platform/master-data/reference'
    );
  }

  /** Tenant adds/edits its own reference rows for a category (Class A + units). */
  saveTenantReferenceCategory(category: string, items: PlatformReferenceItemInput[]) {
    return this.request<{ items: unknown[]; reference: MasterDataReferencePayload }>(
      'PUT',
      `/api/v1/master-data/reference/${category}`,
      items
    );
  }

  /** A tenant's own custom reference rows (excludes owner defaults), grouped by category. */
  getTenantCustomReference() {
    return this.request<{
      categories: Record<string, Array<{ label: string; code: string | null; metadata: Record<string, unknown> | null }>>;
      editable: string[];
    }>('GET', '/api/v1/master-data/reference/custom');
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
    // Request a high limit to get all materials in one shot — a tenant library
    // realistically won't exceed a few hundred rows.
    return this.request<{ items: any[]; total: number; limit: number; offset: number } | any[]>(
      'GET', '/api/v1/materials?limit=500'
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
    return this.request<MasterDataReferencePayload>('GET', '/api/v1/master-data/reference');
  }

  pruneOrphanSubstrates() {
    return this.request<{ pruned: number }>('POST', '/api/v1/materials/prune-orphans');
  }

  // Estimates
  getEstimates(params?: { limit?: number; sourceTemplateKey?: string; status?: string }) {
    const qs = new URLSearchParams();
    if (params?.limit != null) qs.set('limit', String(params.limit));
    if (params?.sourceTemplateKey) qs.set('sourceTemplateKey', params.sourceTemplateKey);
    if (params?.status) qs.set('status', params.status);
    const query = qs.toString();
    return this.request<{ items: any[]; total: number; limit: number; offset: number } | any[]>(
      'GET',
      `/api/v1/estimates${query ? `?${query}` : ''}`
    ).then((res) => {
      if (res && !Array.isArray(res) && 'items' in res) return res.items;
      return res as any[];
    });
  }

  /** Most recently saved draft for a standard template (by sourceTemplateKey). */
  getLatestDraftForTemplate(sourceTemplateKey: string) {
    return this.getEstimates({ sourceTemplateKey, status: 'draft', limit: 1 }).then(
      (rows) => rows[0] ?? null
    );
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

  createTemplate(name: string, estimateId: string, opts?: { saveAsPlatformStandard?: boolean }) {
    return this.request<any>('POST', '/api/v1/templates', {
      name,
      estimateId,
      ...(opts?.saveAsPlatformStandard ? { saveAsPlatformStandard: true } : {}),
    });
  }

  createTemplateFromDefinition(data: {
    name: string;
    productType: 'roll' | 'sleeve' | 'pouch';
    productSubtype?: string | null;
    materialClass: 'PE' | 'Non PE';
    structureTier: 'Mono' | 'Duplex' | 'Triplex' | 'Quadriplex';
    printMode: 'Plain' | 'Printed';
    defaultLayers: Array<{
      layer_order: number;
      layer_type: 'substrate' | 'ink' | 'adhesive';
      materialId?: string | null;
      default_micron: number;
    }>;
    defaultProcesses?: Array<{ process_key: string; enabled: boolean; process_quantity?: number }>;
    /** Admin shortcut: when true, server delegates to the platform-templates path. */
    saveAsPlatformStandard?: boolean;
    cloneFromTemplateId?: string;
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
    const qs = new URLSearchParams();
    if (!standardOnly) qs.set('standard_only', 'false');
    const query = qs.toString();
    return this.request<any[]>('GET', `/api/v1/templates${query ? `?${query}` : ''}`);
  }

  /** Current user's saved templates only (not platform standards). */
  getMyTemplates() {
    return this.request<any[]>('GET', '/api/v1/templates?user_only=true');
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

  /**
   * Resolve a template into a new (unsaved) estimate WITHOUT persisting it. The
   * editor opens this as a draft; nothing is written to the DB until the user saves.
   */
  previewTemplate(id: string, data: {
    customerId?: string;
    jobName?: string;
    orderQuantityKg?: number;
    orderQuantityUnit?: string;
  }) {
    return this.request<{
      preview: true;
      estimate: {
        jobName: string;
        productType: 'roll' | 'sleeve' | 'pouch' | 'bag';
        productSubtype: string | null;
        printingWebClass: 'wide_web' | 'narrow_web';
        dimensions: Record<string, unknown>;
        markupPercent: string;
        displayCurrency: string;
        exchangeRateUsdToDisplay: string;
        orderQuantityKg: string | null;
        orderQuantityUnit: string;
        sourceTemplateKey: string | null;
        masterDataVersion: number | null;
      };
      layers: Array<{
        materialId: string;
        materialName: string;
        materialType: string;
        micron: number;
        costPerKgUsd: number;
        isSolventBased: boolean;
        hoover: string | null;
        position: number;
      }>;
      slabs: Array<{ quantityKg: number; pricePerKg: number }>;
      processes?: Array<{
        name: string;
        processKey: string | null;
        processQuantity: number;
        enabled: boolean;
        costPerHour: number;
        speedBasis: string;
        speedValue: number;
        setupHours: number;
      }>;
    }>('POST', `/api/v1/templates/${id}/instantiate`, { ...data, preview: true });
  }

  // ── Platform-standard catalog (platform_admin only) ────────────────────
  listPlatformTemplates() {
    return this.request<any[]>('GET', '/api/v1/admin/platform-templates');
  }

  getPlatformTemplate(id: string) {
    return this.request<any>('GET', `/api/v1/admin/platform-templates/${id}`);
  }

  createPlatformTemplate(data: {
    name: string;
    pebiParentPg?: string;
    productType: 'roll' | 'sleeve' | 'pouch';
    productSubtype?: string | null;
    materialClass: 'PE' | 'Non PE';
    structureTier: 'Mono' | 'Duplex' | 'Triplex' | 'Quadriplex';
    printMode: 'Plain' | 'Printed';
    defaultLayers: Array<{
      layer_order: number;
      layer_type: 'substrate' | 'ink' | 'adhesive';
      materialId?: string | null;
      ref_material_key?: string;
      default_micron: number;
    }>;
    defaultProcesses?: Array<{ process_key: string; enabled: boolean; process_quantity?: number }>;
    defaultDimensions?: Record<string, unknown>;
    displayOrder?: number;
    cloneFromTemplateId?: string;
  }) {
    return this.request<any>('POST', '/api/v1/admin/platform-templates', data);
  }

  updatePlatformTemplate(id: string, data: Record<string, unknown>) {
    return this.request<Record<string, unknown> & PlatformTemplateSync>(
      'PATCH',
      `/api/v1/admin/platform-templates/${id}`,
      data
    );
  }

  /**
   * Same as updatePlatformTemplate but addressed by the canonical `templateKey`.
   * Used by the editor: tenant copies expose only their local id, but every
   * row carries the cross-table key.
   */
  updatePlatformTemplateByKey(templateKey: string, data: Record<string, unknown>) {
    return this.request<Record<string, unknown> & PlatformTemplateSync>(
      'PATCH',
      `/api/v1/admin/platform-templates/by-key/${encodeURIComponent(templateKey)}`,
      data
    );
  }

  deletePlatformTemplate(id: string) {
    return this.request<{
      ok: boolean;
      deactivated?: boolean;
      alreadyInactive?: boolean;
      /** How many tenant `structure_templates` rows were deactivated by this call. */
      deactivatedTenants?: number;
      /** How many tenant rows were updated in place (e.g. content drift fix). */
      syncedTenants?: number;
    }>('DELETE', `/api/v1/admin/platform-templates/${id}`);
  }

  deletePlatformTemplateByKey(templateKey: string) {
    return this.request<{
      ok: boolean;
      deactivated?: boolean;
      alreadyInactive?: boolean;
      deactivatedTenants?: number;
      syncedTenants?: number;
    }>(
      'DELETE',
      `/api/v1/admin/platform-templates/by-key/${encodeURIComponent(templateKey)}`
    );
  }
}

export const apiClient = new ApiClient();
