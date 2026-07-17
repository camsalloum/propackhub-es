import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type SetStateAction,
} from 'react';
import { apiClient } from '../lib/api';
import type { PriceListUnit, SlabMode } from '../lib/priceListPricing';
import {
  parseQuotePriceListDisplayPrefs,
  quotePriceListPrefsEqual,
  serializeQuotePriceListDisplayPrefs,
  type QuotePriceListDisplayPrefs,
  type QuotePriceListRounding,
} from '../lib/quotePriceListPrefs';

const AUTOSAVE_MS = 300;

const DEFAULT_ROUNDING: QuotePriceListRounding = {
  enabled: false,
  mode: 'step',
  step: 0.05,
};

type PrefsState = {
  unit: PriceListUnit | '';
  currency: string;
  slabMode: SlabMode;
  selectedKeys: Set<string>;
  customSlabs: number[];
  rounding: QuotePriceListRounding;
};

type PatchOptions = {
  immediate?: boolean;
  /** Allow saving with no slabs (None / clear custom). */
  allowClearSlabs?: boolean;
};

type Options = {
  quoteId: string;
  initialPrefs?: unknown;
  autosave?: boolean;
  onSaved?: (prefs: QuotePriceListDisplayPrefs | null) => void;
};

function readInitialState(initialPrefs: unknown): {
  unit: PriceListUnit | '';
  currency: string;
  slabMode: SlabMode;
  selectedKeys: Set<string>;
  customSlabs: number[];
  rounding: QuotePriceListRounding;
  lastSaved: QuotePriceListDisplayPrefs | null;
} {
  const parsed = parseQuotePriceListDisplayPrefs(initialPrefs);
  return {
    unit: parsed?.unit ?? '',
    currency: parsed?.currency ?? '',
    slabMode: parsed?.slabMode ?? 'predefined',
    selectedKeys: new Set(parsed?.selectedBandKeys ?? []),
    customSlabs: parsed?.customSlabs ?? [],
    rounding: parsed?.rounding ?? { ...DEFAULT_ROUNDING },
    lastSaved: parsed ? serializeQuotePriceListDisplayPrefs(parsed) : null,
  };
}

function canPersist(state: PrefsState): boolean {
  if (!state.unit || !state.currency) return false;
  if (state.slabMode === 'custom') return state.customSlabs.length > 0;
  return state.selectedKeys.size > 0;
}

function buildPrefsFromState(state: PrefsState): QuotePriceListDisplayPrefs | null {
  const { unit, currency, slabMode, selectedKeys, customSlabs, rounding } = state;
  if (
    !unit &&
    !currency &&
    selectedKeys.size === 0 &&
    customSlabs.length === 0 &&
    !rounding.enabled
  ) {
    return null;
  }
  return serializeQuotePriceListDisplayPrefs({
    v: 2,
    ...(unit ? { unit } : {}),
    ...(currency ? { currency } : {}),
    slabMode,
    ...(selectedKeys.size > 0 ? { selectedBandKeys: [...selectedKeys].sort() } : {}),
    ...(customSlabs.length > 0 ? { customSlabs } : {}),
    rounding,
  });
}

function shouldPersist(
  state: PrefsState,
  lastSaved: QuotePriceListDisplayPrefs | null,
  allowClearSlabs = false
): boolean {
  const next = buildPrefsFromState(state);
  if (quotePriceListPrefsEqual(next, lastSaved)) return false;
  if (canPersist(state)) return true;
  if (!allowClearSlabs) return false;
  return Boolean(state.unit && state.currency);
}

export function useQuotePriceListPrefs({
  quoteId,
  initialPrefs,
  autosave = true,
  onSaved,
}: Options) {
  const initial = readInitialState(initialPrefs);
  const [unit, setUnitState] = useState<PriceListUnit | ''>(initial.unit);
  const [currency, setCurrencyState] = useState(initial.currency);
  const [slabMode, setSlabModeState] = useState<SlabMode>(initial.slabMode);
  const [selectedKeys, setSelectedKeysState] = useState<Set<string>>(initial.selectedKeys);
  const [customSlabs, setCustomSlabsState] = useState<number[]>(initial.customSlabs);
  const [rounding, setRoundingState] = useState<QuotePriceListRounding>(initial.rounding);
  const [hydrated, setHydrated] = useState(true);

  const stateRef = useRef<PrefsState>({
    unit: initial.unit,
    currency: initial.currency,
    slabMode: initial.slabMode,
    selectedKeys: initial.selectedKeys,
    customSlabs: initial.customSlabs,
    rounding: initial.rounding,
  });
  const lastSavedRef = useRef<QuotePriceListDisplayPrefs | null>(initial.lastSaved);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSavedRef = useRef(onSaved);
  const quoteIdRef = useRef(quoteId);
  const autosaveRef = useRef(autosave);

  onSavedRef.current = onSaved;
  quoteIdRef.current = quoteId;
  autosaveRef.current = autosave;

  stateRef.current = { unit, currency, slabMode, selectedKeys, customSlabs, rounding };

  const persistPrefs = useCallback(async (prefs: QuotePriceListDisplayPrefs | null) => {
    const id = quoteIdRef.current;
    if (!id) return;
    await apiClient.updateQuote(id, { priceListDisplayPrefs: prefs });
    lastSavedRef.current = prefs;
    onSavedRef.current?.(prefs);
  }, []);

  const saveStateNow = useCallback(
    (state: PrefsState, allowClearSlabs = false) => {
      if (!autosaveRef.current || !quoteIdRef.current) return;
      if (!shouldPersist(state, lastSavedRef.current, allowClearSlabs)) return;
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      const payload = buildPrefsFromState(state);
      void persistPrefs(payload).catch((err) => {
        console.error('[price-list] autosave failed:', err);
      });
    },
    [persistPrefs]
  );

  const scheduleDebouncedSave = useCallback(() => {
    if (!autosaveRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      saveStateNow(stateRef.current);
    }, AUTOSAVE_MS);
  }, [saveStateNow]);

  const patchState = useCallback(
    (patch: Partial<PrefsState>, options: PatchOptions = {}) => {
      const { immediate = false, allowClearSlabs = false } = options;
      const nextState = { ...stateRef.current, ...patch };
      stateRef.current = nextState;
      if (immediate) {
        queueMicrotask(() => saveStateNow(nextState, allowClearSlabs));
      } else {
        scheduleDebouncedSave();
      }
      return nextState;
    },
    [saveStateNow, scheduleDebouncedSave]
  );

  const setUnit = useCallback(
    (value: PriceListUnit | '') => {
      setUnitState(value);
      patchState({ unit: value });
    },
    [patchState]
  );

  const setCurrency = useCallback(
    (value: string) => {
      setCurrencyState(value);
      patchState({ currency: value });
    },
    [patchState]
  );

  const setSlabMode = useCallback(
    (value: SlabMode) => {
      setSlabModeState(value);
      patchState({ slabMode: value }, { immediate: true });
    },
    [patchState]
  );

  const setSelectedKeys = useCallback(
    (update: SetStateAction<Set<string>>, options: PatchOptions = {}) => {
      setSelectedKeysState((prev) => {
        const next = typeof update === 'function' ? update(prev) : update;
        patchState({ selectedKeys: next }, { immediate: true, ...options });
        return next;
      });
    },
    [patchState]
  );

  /** Sync slab keys from loaded bands — never triggers autosave. */
  const setSelectedKeysQuiet = useCallback((update: SetStateAction<Set<string>>) => {
    setSelectedKeysState((prev) => {
      const next = typeof update === 'function' ? update(prev) : update;
      stateRef.current = { ...stateRef.current, selectedKeys: next };
      return next;
    });
  }, []);

  const setCustomSlabs = useCallback(
    (update: SetStateAction<number[]>, options: PatchOptions = {}) => {
      setCustomSlabsState((prev) => {
        const next = typeof update === 'function' ? update(prev) : update;
        patchState({ customSlabs: next }, { immediate: true, ...options });
        return next;
      });
    },
    [patchState]
  );

  const setRounding = useCallback(
    (update: SetStateAction<QuotePriceListRounding>) => {
      setRoundingState((prev) => {
        const next = typeof update === 'function' ? update(prev) : update;
        patchState({ rounding: next });
        return next;
      });
    },
    [patchState]
  );

  const setRoundEnabled = useCallback(
    (enabled: boolean) => {
      setRounding((prev) => ({
        enabled,
        mode: 'step',
        step: prev.step ?? 0.05,
      }));
    },
    [setRounding]
  );

  const clearSelectedBands = useCallback(() => {
    const next = new Set<string>();
    setSelectedKeysState(next);
    patchState({ selectedKeys: next }, { immediate: true, allowClearSlabs: true });
  }, [patchState]);

  const clearCustomSlabs = useCallback(() => {
    setCustomSlabsState([]);
    patchState({ customSlabs: [] }, { immediate: true, allowClearSlabs: true });
  }, [patchState]);

  // Re-hydrate only when switching to a different quote.
  useEffect(() => {
    const next = readInitialState(initialPrefs);
    setUnitState(next.unit);
    setCurrencyState(next.currency);
    setSlabModeState(next.slabMode);
    setSelectedKeysState(next.selectedKeys);
    setCustomSlabsState(next.customSlabs);
    setRoundingState(next.rounding);
    stateRef.current = {
      unit: next.unit,
      currency: next.currency,
      slabMode: next.slabMode,
      selectedKeys: next.selectedKeys,
      customSlabs: next.customSlabs,
      rounding: next.rounding,
    };
    lastSavedRef.current = next.lastSaved;
    setHydrated(true);
  }, [quoteId]); // eslint-disable-line react-hooks/exhaustive-deps -- prefs follow quote id only

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      if (!autosaveRef.current || !quoteIdRef.current) return;
      saveStateNow(stateRef.current);
    };
  }, [saveStateNow]);

  return {
    hydrated,
    unit,
    setUnit,
    currency,
    setCurrency,
    slabMode,
    setSlabMode,
    selectedKeys,
    setSelectedKeys,
    setSelectedKeysQuiet,
    clearSelectedBands,
    customSlabs,
    setCustomSlabs,
    clearCustomSlabs,
    rounding,
    setRounding,
    setRoundEnabled,
  };
}
