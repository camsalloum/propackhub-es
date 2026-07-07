import { describe, it, expect } from 'vitest';
import { buildTenantCustomerAccess } from './tenant-customer-access';

describe('buildTenantCustomerAccess', () => {
  it('individual tenant — local customer DB', () => {
    const access = buildTenantCustomerAccess({ type: 'individual', platformCompanyCode: null });
    expect(access.source).toBe('local');
    expect(access.canCreate).toBe(true);
    expect(access.canEdit).toBe(true);
    expect(access.canDelete).toBe(true);
  });

  it('company without PEBI link — local customer DB', () => {
    const access = buildTenantCustomerAccess({ type: 'company', platformCompanyCode: null });
    expect(access.source).toBe('local');
    expect(access.canCreate).toBe(true);
  });

  it('PEBI-linked company — read-only mirror', () => {
    const access = buildTenantCustomerAccess({
      type: 'company',
      platformCompanyCode: 'interplast',
    });
    expect(access.source).toBe('pebi');
    expect(access.pebiLinked).toBe(true);
    expect(access.canCreate).toBe(false);
    expect(access.canEdit).toBe(false);
    expect(access.canDelete).toBe(false);
  });
});
