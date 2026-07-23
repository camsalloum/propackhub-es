import { SectionTitle } from '../../../components/SectionTitle';
import { formatMicronDisplay } from '../../../lib/formatMicron';
import { usdToDisplayPrecise } from '../../../lib/currency';

export type OrderQtyMetrics = {
  kg: number | null;
  kpcs: number | null;
  pieces: number | null;
  sqm: number | null;
  lm: number | null;
  piecesPerKg: number | null;
  gramsPerPiece: number | null;
  sqmPerKg: number | null;
  lmPerKgReel: number | null;
};

export type RmTotals = {
  totalRmPerKg: number;
  totalRmPerM2: number;
};

function statTile(label: string, value: string, unit?: string, title?: string) {
  return (
    <div
      className="rounded-lg border border-border bg-slate/40 px-3 py-2 min-w-0 flex flex-col gap-1 h-full"
      title={title}
    >
      <p className="text-[10px] font-medium text-mist leading-tight break-words">{label}</p>
      <p className="mt-auto font-mono text-sm font-semibold text-navy tabular-nums leading-none">
        {value}
        {unit ? <span className="text-[10px] font-normal text-mist"> {unit}</span> : null}
      </p>
    </div>
  );
}

const fmtQty = (n: number | null | undefined, decimals = 0) =>
  n != null && Number.isFinite(n)
    ? n.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })
    : '—';

export type EstimateEditorYieldAndOrderProps = {
  clientCalcResult: unknown;
  yieldSqmPerKg: number | null;
  orderQtyMetrics: OrderQtyMetrics;
  canFilmDensity: boolean;
  canRmCostPerKg: boolean;
  canCostPerSqm: boolean;
  totalConstructionMicron: number | null | undefined;
  totalGsm: number;
  structureDensity: string;
  productFamily: string;
  structureHasPrinting: boolean;
  rmTotals: RmTotals | null | undefined;
  displayCurrency: string;
  fxRate: number;
};

/** Production summary (yield + order totals) and material cost tiles. */
export function EstimateEditorYieldAndOrder({
  clientCalcResult,
  yieldSqmPerKg,
  orderQtyMetrics,
  canFilmDensity,
  canRmCostPerKg,
  canCostPerSqm,
  totalConstructionMicron,
  totalGsm,
  structureDensity,
  productFamily,
  structureHasPrinting,
  rmTotals,
  displayCurrency,
  fxRate,
}: EstimateEditorYieldAndOrderProps) {
  return (
    <>
      {clientCalcResult ? (
        <div className="card space-y-5">
          <SectionTitle
            as="h3"
            className="font-display font-semibold text-navy"
            hint="Per-kg structure yields and the order quantity expressed in every unit. LM is the finished reel running length."
          >
            Production Summary
          </SectionTitle>

          {/* Yield factors — per-kg rates first, then the structure descriptors */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-mist mb-2">
              Yield Factors
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {statTile(
                'Area Yield',
                fmtQty(yieldSqmPerKg, 4),
                'm²/kg',
                'Square metres of web per kilogram (1000 ÷ GSM)'
              )}
              {statTile(
                'Length Yield',
                fmtQty(orderQtyMetrics.lmPerKgReel, 4),
                'LM/kg',
                'Finished reel running metres per kilogram (m²/kg ÷ reel width)'
              )}
              {statTile(
                'Piece Yield',
                fmtQty(orderQtyMetrics.piecesPerKg, 4),
                'pcs/kg',
                'Finished pieces per kilogram (needs reel width, cut-off, pieces/cut)'
              )}
              {statTile(
                'Piece Weight',
                fmtQty(orderQtyMetrics.gramsPerPiece, 4),
                'g',
                'Grams of film per finished piece'
              )}
              {canFilmDensity &&
                statTile(
                  'Total Thickness',
                  formatMicronDisplay(totalConstructionMicron),
                  'µ',
                  'Total film thickness (substrate µ + ink/adhesive dry gsm ÷ density)'
                )}
              {statTile('Total GSM', fmtQty(totalGsm, 2), 'gsm')}
              {canFilmDensity &&
                statTile('Average Density', structureDensity, 'g/cm³', 'GSM ÷ thickness µ')}
            </div>
          </div>

          {/* Order totals — same structure, every unit */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-mist mb-2">
              Order Totals
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {statTile('Total Weight', fmtQty(orderQtyMetrics.kg, 2), 'kg')}
              {statTile(
                'Total Pieces',
                fmtQty(orderQtyMetrics.pieces, 0),
                'pcs',
                'Total finished pieces for the order'
              )}
              {statTile('Total Area', fmtQty(orderQtyMetrics.sqm, 2), 'm²')}
              {statTile(
                'Total Length',
                fmtQty(orderQtyMetrics.lm, 2),
                'LM',
                'Finished reel running length'
              )}
            </div>
          </div>

          {(() => {
            const isRollSleeve = productFamily === 'roll' || productFamily === 'sleeve';
            const missingLm = isRollSleeve && orderQtyMetrics.lmPerKgReel == null;
            const missingPieces =
              orderQtyMetrics.piecesPerKg == null &&
              (productFamily === 'pouch' ||
                productFamily === 'bag' ||
                (isRollSleeve && structureHasPrinting));
            if (!missingLm && !missingPieces) return null;
            let msg = 'Set the product dimensions in Job details.';
            if (missingLm && missingPieces) {
              msg =
                'Piece and length yield need reel width, cut-off and pieces/cut — set them in Job details.';
            } else if (missingLm) {
              msg = 'Length yield needs reel width — set it in Job details.';
            } else if (isRollSleeve && structureHasPrinting) {
              msg =
                'Piece yield needs reel width, cut-off and pieces/cut — set them in Job details.';
            } else if (productFamily === 'pouch' || productFamily === 'bag') {
              msg = 'Piece yield needs width, height and gussets — set them in Job details.';
            }
            return <p className="text-[11px] text-warning">{msg}</p>;
          })()}
        </div>
      ) : null}

      {canRmCostPerKg && rmTotals ? (
        <div className="card space-y-4">
          <SectionTitle
            as="h3"
            className="font-display font-semibold text-navy"
            hint="Raw-material cost per unit."
          >
            Material cost
          </SectionTitle>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {statTile(
              'RM cost',
              `${displayCurrency} ${usdToDisplayPrecise(rmTotals.totalRmPerKg, fxRate).toFixed(2)}`,
              '/kg'
            )}
            {(canCostPerSqm || canRmCostPerKg) &&
              rmTotals.totalRmPerM2 > 0 &&
              statTile(
                'RM cost',
                `${displayCurrency} ${usdToDisplayPrecise(rmTotals.totalRmPerM2, fxRate).toFixed(4)}`,
                '/m²'
              )}
          </div>
        </div>
      ) : null}
    </>
  );
}
