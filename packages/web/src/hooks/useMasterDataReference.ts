import { useMasterDataContextOptional } from '../contexts/MasterDataContext';
import { useState, useEffect } from 'react';
import { apiClient } from '../lib/api';
import {
  DEFAULT_MASTER_REFERENCE,
  DEFAULT_RM_TYPE_OPTIONS,
  type MasterDataReferenceState,
  type ProductSubtypeOption,
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
          productSubtypeOptions:
            (((ref as { productSubtypeOptions?: ProductSubtypeOption[] }).productSubtypeOptions) ?? []).length > 0
              ? (ref as { productSubtypeOptions?: ProductSubtypeOption[] }).productSubtypeOptions!
              : DEFAULT_MASTER_REFERENCE.productSubtypeOptions,
          processOptions:
            (((ref as { processOptions?: import('../lib/masterDataReference').ProcessOption[] }).processOptions) ?? []).length > 0
              ? (ref as { processOptions?: import('../lib/masterDataReference').ProcessOption[] }).processOptions!
              : DEFAULT_MASTER_REFERENCE.processOptions,
          processRows:
            (ref as { processRows?: Array<{ label: string; code: string; description?: string; costPerKgUsd?: number }> }).processRows ?? [],
          costingDefaults:
            (ref as { costingDefaults?: MasterDataReferenceState['costingDefaults'] }).costingDefaults ??
            DEFAULT_MASTER_REFERENCE.costingDefaults,
          wasteBands:
            ((ref as { wasteBands?: MasterDataReferenceState['wasteBands'] }).wasteBands ?? []).length > 0
              ? (ref as { wasteBands?: MasterDataReferenceState['wasteBands'] }).wasteBands!
              : DEFAULT_MASTER_REFERENCE.wasteBands,
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
