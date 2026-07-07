/**
 * Customer master ownership by tenant licensing.
 *
 * - PEBI-linked company (`platform_company_code` set): CRM master lives in PEBI.
 *   ES holds a read-only mirror (sync). Prospects (`fp_prospects`) stay in PEBI until converted.
 * - Individual or company without PEBI link: ES owns the local customer database.
 */
export type CustomerSource = 'local' | 'pebi';

export type TenantCustomerAccess = {
  source: CustomerSource;
  pebiLinked: boolean;
  platformCompanyCode: string | null;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
};

export type TenantCustomerAccessInput = {
  type?: 'individual' | 'company' | null;
  platformCompanyCode?: string | null;
};

export function buildTenantCustomerAccess(tenant: TenantCustomerAccessInput): TenantCustomerAccess {
  const platformCompanyCode = tenant.platformCompanyCode?.trim() || null;
  const pebiLinked = platformCompanyCode != null;
  return {
    source: pebiLinked ? 'pebi' : 'local',
    pebiLinked,
    platformCompanyCode,
    canCreate: !pebiLinked,
    canEdit: !pebiLinked,
    canDelete: !pebiLinked,
  };
}

export const CUSTOMER_READ_ONLY_MESSAGE =
  'Customers are managed in PEBI for this account. Create or update customers in PEBI, then sync.';

export function formatAuthTenant(tenant: {
  id: string;
  name: string;
  type: 'individual' | 'company';
  displayCurrency: string;
  operatingCostMethod: 'process_per_kg' | 'markup_over_rm' | 'fixed_per_group' | null;
  platformCompanyCode?: string | null;
}) {
  return {
    id: tenant.id,
    name: tenant.name,
    type: tenant.type,
    displayCurrency: tenant.displayCurrency,
    operatingCostMethod: tenant.operatingCostMethod,
    customerAccess: buildTenantCustomerAccess(tenant),
  };
}
