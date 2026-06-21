import { useMasterDataContextOptional } from '../contexts/MasterDataContext';
import { useState, useEffect } from 'react';
import { apiClient } from '../lib/api';
import {
  DEFAULT_MASTER_REFERENCE,
  DEFAULT_RM_TYPE_OPTIONS,
  type MasterDataReferenceState,
} from '../lib/masterDataReference';

export function useMasterDataReference() {
  const ctx = useMasterDataContextOptional();
  const [localReference, setLocalReference] = useState<MasterDataReferenceState>(DEFAULT_MASTER_REFERENCE);
  const [localLoading, setLocalLoading] = useState(!ctx);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = () => {
    if (ctx) ctx.invalidate();
    else setReloadToken((t) => t + 1);
  };

  useEffect(() => {
    if (ctx) return;
    let cancelled = false;
    (async () => {
      setLocalLoading(true);
      try {
        const ref = await apiClient.getMasterDataReference();
        if (cancelled) return;
        setLocalReference({
          productTypeOptions:
            ref.productTypeOptions?.length > 0
              ? ref.productTypeOptions
              : DEFAULT_MASTER_REFERENCE.productTypeOptions,
          printingWebClassOptions:
            ref.printingWebClassOptions?.length > 0
              ? ref.printingWebClassOptions
              : DEFAULT_MASTER_REFERENCE.printingWebClassOptions,
          unitOptions:
            ref.unitOptions?.length > 0 ? ref.unitOptions : DEFAULT_MASTER_REFERENCE.unitOptions,
          rmTypeOptions:
            (ref.rmTypeOptions ?? []).length > 0
              ? (ref.rmTypeOptions as typeof DEFAULT_RM_TYPE_OPTIONS)
              : DEFAULT_RM_TYPE_OPTIONS,
        });
      } catch {
        if (!cancelled) setLocalReference(DEFAULT_MASTER_REFERENCE);
      } finally {
        if (!cancelled) setLocalLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ctx, reloadToken]);

  if (ctx) {
    return { reference: ctx.reference, loading: ctx.loading, reload: ctx.invalidate, version: ctx.version };
  }

  return { reference: localReference, loading: localLoading, reload, version: reloadToken };
}
