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
  const [reference, setReference] = useState<MasterDataReferenceState>(DEFAULT_MASTER_REFERENCE);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);

  const invalidate = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
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
          costingDefaults:
            (ref as { costingDefaults?: MasterDataReferenceState['costingDefaults'] }).costingDefaults ??
            DEFAULT_MASTER_REFERENCE.costingDefaults,
        });
      } catch {
        if (!cancelled) setReference(DEFAULT_MASTER_REFERENCE);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [version]);

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
