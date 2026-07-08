import { useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { apiClient } from '../lib/api';
import { useMaterialsContextOptional } from '../contexts/MaterialsContext';
import { useMasterDataContextOptional } from '../contexts/MasterDataContext';

const POLL_MS = 60_000;

/** Polls catalog revision and refreshes session caches on version or sync bump. */
export function CatalogRefreshCoordinator() {
  const { authReady, isAuthenticated } = useAuth();
  const materialsCtx = useMaterialsContextOptional();
  const masterCtx = useMasterDataContextOptional();
  const lastVersionRef = useRef<number | null>(null);
  const lastSyncedAtRef = useRef<string | null>(null);

  useEffect(() => {
    if (!authReady || !isAuthenticated || !materialsCtx || !masterCtx) return;

    let cancelled = false;

    const check = async () => {
      try {
        const meta = await apiClient.getMaterialsMeta();
        if (cancelled) return;

        const versionChanged =
          lastVersionRef.current !== null && meta.masterDataVersion !== lastVersionRef.current;
        const syncChanged =
          lastSyncedAtRef.current !== null && meta.materialsSyncedAt !== lastSyncedAtRef.current;

        if (versionChanged || syncChanged) {
          materialsCtx.invalidate();
          masterCtx.invalidate();
        }

        lastVersionRef.current = meta.masterDataVersion;
        lastSyncedAtRef.current = meta.materialsSyncedAt;
      } catch {
        // ignore transient network errors
      }
    };

    void check();

    const interval = setInterval(() => void check(), POLL_MS);

    const onVisible = () => {
      if (document.visibilityState === 'visible') void check();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [authReady, isAuthenticated, materialsCtx, masterCtx]);

  return null;
}
