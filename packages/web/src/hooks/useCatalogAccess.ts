import { useAuth } from '../contexts/AuthContext';
import { resolveCatalogAccess } from '../lib/tenantCatalogAccess';

export function useCatalogAccess() {
  const { tenant } = useAuth();
  return resolveCatalogAccess(tenant?.catalogAccess);
}
