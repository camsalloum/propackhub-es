import type { LaminationRecipe } from '@es/engine';

export interface MaterialItem {
  id: string; name: string; type: string; solidPercent: number;
  density: string; costPerKgUsd: string; wastePercent: number; isSolventBased: boolean;
  hoover?: string | null; substrateFamily?: string | null; subcategoryId?: string | null;
  platformMasterKey?: string | null;
  laminationRecipe?: LaminationRecipe | null;
  // Accessory pricing (type='accessory' rows). Strings from the API decimal columns.
  accessoryKind?: string | null;
  costPerMeterUsd?: string | null;
  costPerPieceUsd?: string | null;
  weightGramPerMeter?: string | null;
  weightGramPerPiece?: string | null;
  priceUnit?: string | null;
  unitPriceUsd?: string | null;
}

export interface LayerItem {
  id: string; materialId: string; materialName: string; materialType: string;
  micron: number; gsm: number; costPerKgUsd: number; isSolventBased: boolean; position: number;
  hoover?: string | null;
  platformMasterKeySnapshot?: string | null;
  costingKeySnapshot?: string | null;
}

export interface DimensionState {
  reelWidthMm: number; cutoffMm: number; numberOfUps: number;
  extraPrintingTrimMm: number; piecesPerCut: number; openWidthMm: number; openHeightMm: number;
  // Index signature: dimensions are a flat numeric map; lets us round-trip through
  // Record<string, unknown> for save/load without unsafe casts (Deep Audit §5.1 / task 0.2).
  [key: string]: number;
}

export type EstimateEditorProps = {
  /** Rendered inside QuoteWorkspace — parent owns Back / quote chrome. */
  embedded?: boolean;
  estimateIdOverride?: string;
  backTo?: string;
  /** Single-estimate quote: hide estimate ref so only Quote PKG-… shows in parent. */
  hideEstimateRef?: boolean;
  /** Parent quote is sent — structure/price edits blocked (re-quote or unlock). */
  readOnly?: boolean;
  /** Internal price check — product group only, no customer / SKU / RFQ fields. */
  priceCheckMode?: boolean;
  /** Quote workspace owns price list — hide the in-editor Price list tab. */
  hidePriceListTab?: boolean;
  /** Quote has multiple estimates — show variant label (price check). */
  multiOnQuote?: boolean;
  /** After save, refresh quote workspace (variant labels). */
  onSaved?: () => void;
};
