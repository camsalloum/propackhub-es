import { useCallback, useEffect, useRef, useState } from 'react';
import type { ProcessCostRow } from '../../../lib/estimateConfigure';
import type { ProcessOption } from '../../../lib/masterDataReference';
import type { LayerItem, MaterialItem } from '../types';
import {
  deriveUiProcessesFromLayers,
  layersStructureSignature,
  processDiffSummary,
  type DerivedProcessUiRow,
} from '../lib/deriveEstimateProcesses';

type EstimateForkFields = {
  id?: string;
  sourceTemplateKey?: string | null;
  structureForked?: boolean | null;
  processesCustomized?: boolean | null;
  structureSignature?: string | null;
} | null;

type Args = {
  layers: LayerItem[];
  materials: MaterialItem[];
  productType: string;
  productTypeOptions: Array<{ value: string }>;
  materialClass?: 'PE' | 'Non PE' | null;
  estimate: EstimateForkFields;
  processCostCatalog: ProcessCostRow[];
  processOptions: ProcessOption[];
  processesState: any[];
  setProcessesState: (rows: any[]) => void;
  normalizeLoadedProcesses: (rows: any[]) => any[];
  readOnly: boolean;
  /** Skip while estimate is still loading / hydrating. */
  ready: boolean;
};

/**
 * Part B Phase 3 — live client re-derivation + confirm modal on structure fork.
 */
export function useStructureProcessFork({
  layers,
  materials,
  productType,
  productTypeOptions,
  materialClass,
  estimate,
  processCostCatalog,
  processesState,
  setProcessesState,
  normalizeLoadedProcesses,
  readOnly,
  ready,
}: Args) {
  const [localForked, setLocalForked] = useState(false);
  const [localCustomized, setLocalCustomized] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingProcesses, setPendingProcesses] = useState<DerivedProcessUiRow[]>([]);
  const [diffLines, setDiffLines] = useState<string[]>([]);
  const [processesStale, setProcessesStale] = useState(false);

  const templateSigRef = useRef<string | null>(null);
  const templateProcessesRef = useRef<DerivedProcessUiRow[]>([]);
  const lastSigRef = useRef<string | null>(null);
  const hydrateIdRef = useRef<string | null>(null);
  const suppressRef = useRef(false);

  const hasTemplate = Boolean(estimate?.sourceTemplateKey?.trim());
  const serverForked = Boolean(estimate?.structureForked);
  const serverCustomized = Boolean(estimate?.processesCustomized);
  // Scratch / no template = always structure-owned (server sets structure_forked=true).
  const structureForked = !hasTemplate || serverForked || localForked;
  const processesCustomized = serverCustomized || localCustomized;
  const structureLocked = hasTemplate && !structureForked;

  // Capture template baseline once per estimate hydrate (while still template-locked).
  useEffect(() => {
    if (!ready || !estimate?.id) return;
    if (hydrateIdRef.current === estimate.id) return;
    hydrateIdRef.current = estimate.id;
    setLocalForked(false);
    setLocalCustomized(false);
    setProcessesStale(false);
    setConfirmOpen(false);
    suppressRef.current = true;
    const sig = layersStructureSignature(layers, productType, productTypeOptions);
    lastSigRef.current = sig;
    if (!estimate.structureForked) {
      templateSigRef.current = estimate.structureSignature || sig;
      templateProcessesRef.current = normalizeLoadedProcesses(processesState);
    } else {
      templateSigRef.current = estimate.structureSignature ?? null;
      templateProcessesRef.current = [];
    }
    // Allow layer effects after hydrate settles.
    const t = window.setTimeout(() => {
      suppressRef.current = false;
    }, 0);
    return () => window.clearTimeout(t);
    // Intentionally only on estimate id / ready — not every layer change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, estimate?.id]);

  const deriveNow = useCallback(() => {
    return normalizeLoadedProcesses(
      deriveUiProcessesFromLayers({
        layers,
        materials,
        productType,
        materialClass,
        processCostCatalog,
      })
    );
  }, [
    layers,
    materials,
    productType,
    materialClass,
    processCostCatalog,
    normalizeLoadedProcesses,
  ]);

  useEffect(() => {
    if (!ready || readOnly || suppressRef.current) return;
    if (!processCostCatalog.length) return;
    if (layers.length === 0) return;

    const sig = layersStructureSignature(layers, productType, productTypeOptions);
    if (sig === lastSigRef.current) return;
    const prevSig = lastSigRef.current;
    lastSigRef.current = sig;

    // Template-locked: first structural change → fork + confirm.
    if (hasTemplate && !structureForked && templateSigRef.current && sig !== templateSigRef.current) {
      const derived = deriveNow();
      setLocalForked(true);
      setDiffLines(processDiffSummary(processesState, derived));
      setPendingProcesses(derived);
      setConfirmOpen(true);
      return;
    }

    // Snap-back: structure matches template again and not customized.
    if (
      hasTemplate &&
      structureForked &&
      !processesCustomized &&
      templateSigRef.current &&
      sig === templateSigRef.current
    ) {
      setLocalForked(false);
      setProcessesStale(false);
      if (templateProcessesRef.current.length) {
        setProcessesState(normalizeLoadedProcesses(templateProcessesRef.current));
      }
      return;
    }

    // Live re-derive for forked / scratch when not customized.
    if (structureForked && !processesCustomized) {
      const derived = deriveNow();
      // Scratch / already-forked: open confirm only on first transition from empty/prev.
      if (!hasTemplate && prevSig && !confirmOpen) {
        setDiffLines(processDiffSummary(processesState, derived));
        setPendingProcesses(derived);
        setConfirmOpen(true);
      } else {
        setProcessesState(derived);
      }
      return;
    }

    // Customized + structure changed → stale (no silent overwrite).
    if (processesCustomized && prevSig) {
      setProcessesStale(true);
    }
  }, [
    ready,
    readOnly,
    layers,
    productType,
    productTypeOptions,
    processCostCatalog,
    hasTemplate,
    structureForked,
    processesCustomized,
    deriveNow,
    processesState,
    setProcessesState,
    normalizeLoadedProcesses,
    confirmOpen,
  ]);

  const confirmProcesses = useCallback(
    (rows: DerivedProcessUiRow[], edited: boolean) => {
      const normalized = normalizeLoadedProcesses(rows);
      setProcessesState(normalized);
      if (edited) setLocalCustomized(true);
      setProcessesStale(false);
      setConfirmOpen(false);
    },
    [normalizeLoadedProcesses, setProcessesState]
  );

  const cancelConfirm = useCallback(() => {
    // Keep derived suggestion applied for forked/scratch so M&O isn't blank;
    // user can still edit in the Processes panel.
    if (pendingProcesses.length) {
      setProcessesState(normalizeLoadedProcesses(pendingProcesses));
    }
    setConfirmOpen(false);
  }, [pendingProcesses, normalizeLoadedProcesses, setProcessesState]);

  const rederiveFromStructure = useCallback(() => {
    const derived = deriveNow();
    setDiffLines(processDiffSummary(processesState, derived));
    setPendingProcesses(derived);
    setLocalCustomized(false);
    setProcessesStale(false);
    setConfirmOpen(true);
  }, [deriveNow, processesState]);

  return {
    structureLocked,
    structureForked,
    processesCustomized,
    processesStale,
    confirmOpen,
    pendingProcesses,
    setPendingProcesses,
    diffLines,
    confirmProcesses,
    cancelConfirm,
    rederiveFromStructure,
  };
}
