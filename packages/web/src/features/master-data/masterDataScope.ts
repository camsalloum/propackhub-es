export type MasterDataScope = 'platform' | 'tenant';

export function resolveMasterDataScope(
  role: 'user' | 'tenant_admin' | 'platform_admin' | undefined
): MasterDataScope {
  return role === 'platform_admin' ? 'platform' : 'tenant';
}

export function canManageMasterData(
  role: 'user' | 'tenant_admin' | 'platform_admin' | undefined,
  tenantType: 'individual' | 'company' | undefined
): boolean {
  if (role === 'platform_admin' || role === 'tenant_admin') return true;
  return role === 'user' && tenantType === 'individual';
}

/** Reference tabs owned by the platform catalog (read-only in tenant scope). */
export function isPlatformOnlyRefTab(tab: string): boolean {
  return tab === 'product_type' || tab === 'waste_bands' || tab === 'templates';
}

/** Tenant may add overlay rows for these reference categories. */
export function isTenantCustomRefTab(tab: string): boolean {
  return tab === 'rm_type' || tab === 'unit' || tab === 'process' || tab === 'product_subtype';
}
