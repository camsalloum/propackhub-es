import NumberTicker from '../../../components/NumberTicker';

export type EstimateEditorMobilePriceBarProps = {
  activeSection: 'structure' | 'dimensions' | 'slabs';
  displaySalePrice: number;
  displayCurrency: string;
  readOnly: boolean;
  saving: boolean;
  onSaveDraft: () => void;
  onSaveFinal: () => void;
};

/** Mobile sticky selling-price bar — hidden on Price list. */
export function EstimateEditorMobilePriceBar({
  activeSection,
  displaySalePrice,
  displayCurrency,
  readOnly,
  saving,
  onSaveDraft,
  onSaveFinal,
}: EstimateEditorMobilePriceBarProps) {
  if (activeSection === 'slabs') return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 md:hidden bg-surface-raised border-t border-border px-4 py-3 z-50 shadow-lg safe-area-pb">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div>
          <p className="eyebrow leading-none">Selling price</p>
          <p className="text-xl font-display font-bold text-accent-text tabular mt-1">
            <NumberTicker
              value={displaySalePrice}
              durationMs={600}
              decimals={2}
              prefix={`${displayCurrency} `}
              suffix="/kg"
            />
          </p>
        </div>
        {!readOnly && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSaveDraft}
              disabled={saving}
              className="btn-secondary px-3 py-2 text-sm min-h-[48px]"
            >
              {saving ? '…' : 'Draft'}
            </button>
            <button
              type="button"
              onClick={onSaveFinal}
              disabled={saving}
              className="btn-primary px-4 py-2 text-sm min-h-[48px]"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
