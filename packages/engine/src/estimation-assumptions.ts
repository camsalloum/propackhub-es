/**
 * Catalog of estimation assumptions — Master Data “Assumptions” tab + docs.
 * Keep in sync with packaging-costing / consumables-costing / solvent modules.
 */
import {
  DEFAULT_CARTONS_PER_PALLET,
  DEFAULT_LD_WRAP_FILM_WIDTH_MM,
  DEFAULT_LD_WRAP_GSM,
  DEFAULT_LD_WRAP_PASSES,
  DEFAULT_LOAD_PER_PALLET_KG,
  DEFAULT_PALLET_FOOTPRINT_L_M,
  DEFAULT_PALLET_FOOTPRINT_W_M,
  DEFAULT_PCS_PER_CARTON,
  DEFAULT_STRETCH_WRAP_LAYERS,
  SLEEVE_PACK_TARGET_OD_MM,
  STRETCH_ROLL_LENGTH_M,
} from './packaging-costing';
import {
  CYLINDER_REPEAT_MAX_M,
  CYLINDER_REPEAT_MIN_M,
  DEFAULT_MOUNT_WIDTH_M,
  DEFAULT_REPEAT_M,
} from './consumables-costing';
import { INK_SOLVENT_RATIO_FLEXO, INK_SOLVENT_RATIO_ROTOGRAVURE } from './ink-printing';
import { DEFAULT_CLEANING_SOLVENT_KG_PER_JOB } from './lamination-recipe';
import { DEFAULT_SLEEVE_SEAMING_SOLVENT_GSM } from './sleeve-seaming';

export type AssumptionCategory = 'packaging' | 'consumables' | 'solvent' | 'geometry';

export type AssumptionEditability = 'estimate' | 'master_data' | 'fixed';

export interface EstimationAssumption {
  id: string;
  category: AssumptionCategory;
  title: string;
  /** Plain-language formula / rule */
  formula: string;
  defaultDisplay: string;
  /** Where the owner can change it */
  editability: AssumptionEditability;
  notes?: string;
}

export const ESTIMATION_ASSUMPTIONS: EstimationAssumption[] = [
  // ── Packaging ────────────────────────────────────────────────────────────
  {
    id: 'pack-core',
    category: 'packaging',
    title: 'Core length',
    formula:
      'Core (m) = (reel width or lay-flat mm ÷ 1000) × rolls in order. Rolls = order kg ÷ roll weight (sleeve uses pack OD).',
    defaultDisplay: 'Geometry-driven',
    editability: 'estimate',
    notes:
      'Priced $/m of tube axis (finished width), not film running metres. Qty overrideable on the estimate.',
  },
  {
    id: 'pack-ld-wrap',
    category: 'packaging',
    title: 'Roll wrap (LD)',
    formula:
      'kg = rolls × (π × OD_mm / 1000 × passes × filmWidth_mm / 1000 × GSM / 1000)',
    defaultDisplay: `${DEFAULT_LD_WRAP_PASSES} passes · ${DEFAULT_LD_WRAP_FILM_WIDTH_MM} mm · ${DEFAULT_LD_WRAP_GSM} gsm`,
    editability: 'fixed',
    notes: 'Passes / film width / GSM are engine defaults (not on estimate UI today).',
  },
  {
    id: 'pack-stretch',
    category: 'packaging',
    title: 'Stretch wrap',
    formula:
      'rolls = pallets × ((2(L+W)+L) × layers) ÷ stretch roll length',
    defaultDisplay: `${DEFAULT_STRETCH_WRAP_LAYERS} layers · footprint ${DEFAULT_PALLET_FOOTPRINT_L_M}×${DEFAULT_PALLET_FOOTPRINT_W_M} m · roll ${STRETCH_ROLL_LENGTH_M} m`,
    editability: 'estimate',
    notes: 'Layers editable on estimate. Footprint and stretch roll length are fixed.',
  },
  {
    id: 'pack-pallet-roll',
    category: 'packaging',
    title: 'Pallets (roll)',
    formula: 'pallets = ceil(order kg ÷ load per pallet)',
    defaultDisplay: `${DEFAULT_LOAD_PER_PALLET_KG} kg / pallet`,
    editability: 'estimate',
  },
  {
    id: 'pack-pallet-carton',
    category: 'packaging',
    title: 'Pallets (sleeve / pouch / bag)',
    formula: 'pallets = ceil(cartons ÷ cartons per pallet)',
    defaultDisplay: `${DEFAULT_CARTONS_PER_PALLET} cartons / pallet`,
    editability: 'estimate',
  },
  {
    id: 'pack-carton-pouch',
    category: 'packaging',
    title: 'Cartons (pouch / bag)',
    formula: 'cartons = ceil(pieces ÷ pcs per carton); pieces = order kg × pcs/kg',
    defaultDisplay: `${DEFAULT_PCS_PER_CARTON} pcs / carton`,
    editability: 'estimate',
  },
  {
    id: 'pack-sleeve-od',
    category: 'packaging',
    title: 'Sleeve pack OD',
    formula: 'Sleeve roll weight / carton match uses a fixed pack outside diameter.',
    defaultDisplay: `${SLEEVE_PACK_TARGET_OD_MM} mm`,
    editability: 'fixed',
  },

  // ── Consumables ──────────────────────────────────────────────────────────
  {
    id: 'cons-mount-width',
    category: 'consumables',
    title: 'Mounting tape width',
    formula: 'Plate mount width (not finished goods width). Area = colors × width × cylinder repeat.',
    defaultDisplay: `${DEFAULT_MOUNT_WIDTH_M * 1000} mm`,
    editability: 'estimate',
  },
  {
    id: 'cons-cylinder-repeat',
    category: 'consumables',
    title: 'Mounting tape cylinder repeat',
    formula:
      'Flexo cylinder circumference for plate tape — not product cutoff. Reuse cutoff only if already in the 500–600 mm band; otherwise use the average.',
    defaultDisplay: `${DEFAULT_REPEAT_M * 1000} mm (band ${CYLINDER_REPEAT_MIN_M * 1000}–${CYLINDER_REPEAT_MAX_M * 1000} mm)`,
    editability: 'estimate',
    notes: 'Editable on estimate; default is smart (cylinder), not customer cut-off.',
  },
  {
    id: 'cons-other',
    category: 'consumables',
    title: 'Other consumables',
    formula: '$/kg finished goods allowance applied straight into Total RM.',
    defaultDisplay: 'From PEBI CONSUMABLES sync',
    editability: 'estimate',
  },

  // ── Solvent ──────────────────────────────────────────────────────────────
  {
    id: 'solv-flexo-ratio',
    category: 'solvent',
    title: 'Ink dilution (flexo)',
    formula: 'Makeup solvent GSM = dry ink GSM × ink:solvent ratio (shown as 1 : N).',
    defaultDisplay: `1 : ${INK_SOLVENT_RATIO_FLEXO}`,
    editability: 'estimate',
  },
  {
    id: 'solv-roto-ratio',
    category: 'solvent',
    title: 'Ink dilution (rotogravure)',
    formula: 'Same as flexo with a higher default solvent parts.',
    defaultDisplay: `1 : ${INK_SOLVENT_RATIO_ROTOGRAVURE}`,
    editability: 'estimate',
  },
  {
    id: 'solv-cleaning',
    category: 'solvent',
    title: 'Press cleaning solvent',
    formula: 'Job kg × solvent $/kg → spread over order kg.',
    defaultDisplay: `${DEFAULT_CLEANING_SOLVENT_KG_PER_JOB} kg / job`,
    editability: 'master_data',
    notes: 'Platform Master Data → Solvent tab sets the default for new estimates; overrideable per estimate.',
  },
  {
    id: 'solv-seaming',
    category: 'solvent',
    title: 'Sleeve seaming solvent',
    formula: 'cost/m² = (GSM / 1000) × blend $/kg (75% THF / 25% dioxolane).',
    defaultDisplay: `${DEFAULT_SLEEVE_SEAMING_SOLVENT_GSM} g/m²`,
    editability: 'estimate',
    notes: 'Blend ratio is fixed in the engine.',
  },
];

export const ASSUMPTION_CATEGORY_LABELS: Record<AssumptionCategory, string> = {
  packaging: 'Packaging',
  consumables: 'Consumables',
  solvent: 'Solvent & ink',
  geometry: 'Geometry',
};

export const ASSUMPTION_EDIT_LABELS: Record<AssumptionEditability, string> = {
  estimate: 'Editable on estimate',
  master_data: 'Default in Master Data',
  fixed: 'Fixed in engine (read-only)',
};
