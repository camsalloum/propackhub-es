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
import type { CategoryNode } from '../lib/materialTaxonomy';

export type MaterialListItem = {
  id: string;
  name: string;
  type?: string;
  materialType?: string;
  density?: string | number;
  solidPercent?: string | number;
  costPerKgUsd?: string | number;
  substrateFamily?: string | null;
  substrateGrade?: string | null;
  isSolventBased?: boolean;
  hoover?: string | null;
  [key: string]: unknown;
};

type MaterialsContextValue = {
  materials: MaterialListItem[];
  categories: CategoryNode[];
  loading: boolean;
  invalidate: () => void;
};

const MaterialsContext = createContext<MaterialsContextValue | null>(null);

export function MaterialsProvider({ children }: { children: ReactNode }) {
  const { authReady, isAuthenticated } = useAuth();
  const [materials, setMaterials] = useState<MaterialListItem[]>([]);
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [version, setVersion] = useState(0);

  const invalidate = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    if (!authReady || !isAuthenticated) {
      setMaterials([]);
      setCategories([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const [materialRows, cats] = await Promise.all([
          apiClient.getMaterials(),
          apiClient.getCategories().catch(() => []),
        ]);
        if (cancelled) return;
        setMaterials((materialRows as MaterialListItem[]) || []);
        setCategories((cats as CategoryNode[]) || []);
      } catch {
        if (!cancelled) {
          setMaterials([]);
          setCategories([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authReady, isAuthenticated, version]);

  const value = useMemo(
    () => ({ materials, categories, loading, invalidate }),
    [materials, categories, loading, invalidate]
  );

  return <MaterialsContext.Provider value={value}>{children}</MaterialsContext.Provider>;
}

export function useMaterialsContext() {
  const ctx = useContext(MaterialsContext);
  if (!ctx) {
    throw new Error('useMaterialsContext must be used within MaterialsProvider');
  }
  return ctx;
}

export function useMaterialsContextOptional() {
  return useContext(MaterialsContext);
}
