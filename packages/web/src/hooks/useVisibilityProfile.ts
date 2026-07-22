import { useEffect, useState, useCallback, useMemo } from 'react';
import type { VisibilityProfile } from '@es/engine';
import { apiClient } from '../lib/api';

const PREVIEW_KEY = 'es_visibility_preview';

const ADMIN_PROFILE: VisibilityProfile = {
  structureLayers: true, layerMicrons: true, dimensions: true, totalGsm: true,
  printingWebClass: true, productDimensionInputs: true, printingWebWidth: true,
  filmDensity: true, gramsPerPiece: true, yieldConversions: true, rollAfterSlitting: true,
  orderQtyUnitBreakdown: true, alternatePriceUnits: true, materialCostPerKg: true,
  costPerSqm: true, rmCostPerKg: true, markupPercent: true, markupAmount: true,
  platesPerKg: true, deliveryPerKg: true, operationCost: true, costBreakdown: true,
  solventMixCost: true, overrideOperatingCostMethod: true, sellingPrice: true, slabTable: true, proposalPdf: true,
};

const SALES_REP_PROFILE: VisibilityProfile = {
  structureLayers: true, layerMicrons: true, dimensions: true, totalGsm: true,
  printingWebClass: true, productDimensionInputs: true, printingWebWidth: true,
  filmDensity: true, gramsPerPiece: false, yieldConversions: false, rollAfterSlitting: false,
  orderQtyUnitBreakdown: false, alternatePriceUnits: false, materialCostPerKg: false,
  costPerSqm: false, rmCostPerKg: false, markupPercent: false, markupAmount: false,
  platesPerKg: false, deliveryPerKg: false, operationCost: false, costBreakdown: false,
  solventMixCost: false, overrideOperatingCostMethod: false, sellingPrice: true, slabTable: true, proposalPdf: true,
};

export function useVisibilityProfile(userRole?: string) {
  const [profile, setProfile] = useState<VisibilityProfile | null>(null);
  const [previewPreset, setPreviewPresetState] = useState<string | null>(() =>
    sessionStorage.getItem(PREVIEW_KEY)
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await apiClient.getMe();
        if (!cancelled) {
          setProfile(me.user.visibilityProfile as unknown as VisibilityProfile);
        }
      } catch {
        if (!cancelled) {
          const isAdmin = userRole === 'tenant_admin' || userRole === 'platform_admin';
          setProfile(isAdmin ? ADMIN_PROFILE : SALES_REP_PROFILE);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [userRole]);

  const effectiveProfile = useMemo(() => {
    if (previewPreset === 'sales_rep') return SALES_REP_PROFILE;
    if (previewPreset === 'admin') return ADMIN_PROFILE;
    const base =
      userRole === 'tenant_admin' || userRole === 'platform_admin'
        ? ADMIN_PROFILE
        : SALES_REP_PROFILE;
    return profile ? { ...base, ...profile } : base;
  }, [profile, previewPreset, userRole]);

  const can = useCallback(
    (key: keyof VisibilityProfile) => Boolean(effectiveProfile[key]),
    [effectiveProfile]
  );

  const setPreviewPreset = useCallback((preset: string | null) => {
    setPreviewPresetState(preset);
    if (preset) sessionStorage.setItem(PREVIEW_KEY, preset);
    else sessionStorage.removeItem(PREVIEW_KEY);
  }, []);

  return {
    profile: effectiveProfile,
    can,
    isPreviewing: !!previewPreset,
    previewPreset,
    setPreviewPreset,
  };
}

export { ADMIN_PROFILE, SALES_REP_PROFILE, PREVIEW_KEY };

export const VISIBILITY_KEYS = [
  'structureLayers', 'layerMicrons', 'dimensions', 'totalGsm', 'printingWebClass',
  'productDimensionInputs', 'printingWebWidth', 'filmDensity', 'gramsPerPiece',
  'yieldConversions', 'rollAfterSlitting', 'orderQtyUnitBreakdown', 'alternatePriceUnits',
  'materialCostPerKg', 'costPerSqm', 'rmCostPerKg', 'markupPercent', 'markupAmount',
  'platesPerKg', 'deliveryPerKg', 'operationCost', 'costBreakdown', 'solventMixCost',
  'overrideOperatingCostMethod', 'sellingPrice', 'slabTable', 'proposalPdf',
] as const;
