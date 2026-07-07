import { useAuth } from '../contexts/AuthContext';
import { resolveCustomerAccess } from '../lib/tenantCustomerAccess';

export function useCustomerAccess() {
  const { tenant } = useAuth();
  return resolveCustomerAccess(tenant?.customerAccess);
}
