export type CustomerSource = 'local' | 'pebi';

export type TenantCustomerAccess = {
  source: CustomerSource;
  pebiLinked: boolean;
  platformCompanyCode: string | null;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
};

export const LOCAL_CUSTOMER_ACCESS: TenantCustomerAccess = {
  source: 'local',
  pebiLinked: false,
  platformCompanyCode: null,
  canCreate: true,
  canEdit: true,
  canDelete: true,
};

export function resolveCustomerAccess(
  access: TenantCustomerAccess | null | undefined
): TenantCustomerAccess {
  return access ?? LOCAL_CUSTOMER_ACCESS;
}
