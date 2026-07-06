import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { apiClient } from '../lib/api';
import { useAuth } from './AuthContext';
import {
  DEFAULT_MASTER_REFERENCE,
  DEFAULT_RM_TYPE_OPTIONS,
  type MasterDataReferenceState,
  type ProductSubtypeOption,
} from '../lib/masterDataReference';

type MasterDataContextValue = {
  reference: MasterDataReferenceState;
  loading: boolean;
  version: number;
  invalidate: () => void;
};

const MasterDataContext = createContext<MasterDataContextValue | null>(null);

export function MasterDataProvider({ children }: { children: ReactNode }) {
  const { authReady, isAuthenticated } = useAuth();
  const [reference, setReference] = useState<MasterDataReferenceState>(DEFAULT_MASTER_REFERENCE);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);

  const invalidate = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    if (!authReady || !isAuthenticated) {
      if (version === 0) setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      // Initial load shows a spinner; later invalidate()/focus refreshes stay silent.
      if (version === 0) setLoading(true);
      try {
        const ref = await apiClient.getMasterDataReference();
        if (cancelled) return;
        setReference({
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
          wasteBandsByPrintMode: (() => {
            const byMode = (ref as { wasteBandsByPrintMode?: MasterDataReferenceState['wasteBandsByPrintMode'] })
              .wasteBandsByPrintMode;
            if (byMode?.printed?.length || byMode?.plain?.length) {
              return {
                printed: byMode.printed?.length
                  ? byMode.printed
                  : DEFAULT_MASTER_REFERENCE.wasteBandsByPrintMode!.printed,
                plain: byMode.plain?.length
                  ? byMode.plain
                  : DEFAULT_MASTER_REFERENCE.wasteBandsByPrintMode!.plain,
              };
            }
            return DEFAULT_MASTER_REFERENCE.wasteBandsByPrintMode;
          })(),
          cormScaleWithWaste:
            typeof (ref as { cormScaleWithWaste?: number }).cormScaleWithWaste === 'number'
              ? (ref as { cormScaleWithWaste: number }).cormScaleWithWaste
              : DEFAULT_MASTER_REFERENCE.cormScaleWithWaste,
        });
      } catch {
        if (!cancelled && version === 0) setReference(DEFAULT_MASTER_REFERENCE);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [version, authReady, isAuthenticated]);

  const value = useMemo(
    () => ({ reference, loading, version, invalidate }),
    [reference, loading, version, invalidate]
  );

  return <MasterDataContext.Provider value={value}>{children}</MasterDataContext.Provider>;
}

export function useMasterDataContext() {
  const ctx = useContext(MasterDataContext);
  if (!ctx) {
    throw new Error('useMasterDataContext must be used within MasterDataProvider');
  }
  return ctx;
}

/** Safe hook — works outside provider (falls back to one-shot fetch). */
export function useMasterDataContextOptional() {
  return useContext(MasterDataContext);
}
