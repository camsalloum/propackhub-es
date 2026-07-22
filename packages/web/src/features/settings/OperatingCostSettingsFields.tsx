import type { OperatingCostMethod } from '@es/engine';

type Props = {
  displayCurrency: string;
  operatingCostMethod: OperatingCostMethod;
  defaultMarkup: number;
  defaultProfitMarginPercent: number;
  onMethodChange: (m: OperatingCostMethod) => void;
  onMarkupChange: (n: number) => void;
  onProfitMarginChange: (n: number) => void;
};

export function OperatingCostSettingsFields({
  displayCurrency,
  operatingCostMethod,
  defaultMarkup,
  defaultProfitMarginPercent,
  onMethodChange,
  onMarkupChange,
  onProfitMarginChange,
}: Props) {
  return (
    <>
      <div>
        <label className="block text-sm font-medium text-brand mb-2">
          Manufacturing &amp; Operating cost
        </label>
        <select
          value={operatingCostMethod}
          onChange={(e) => onMethodChange(e.target.value as OperatingCostMethod)}
          className="input w-full max-w-[32rem]"
        >
          <option value="process_per_kg">Per-kg process cost (Σ process × qty)</option>
          <option value="markup_over_rm">Markup over material (Total RM × markup %)</option>
          <option value="fixed_per_group">Fixed CoRM per template ({displayCurrency}/kg)</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-brand mb-2">
          {operatingCostMethod === 'markup_over_rm' ? 'Markup over material %' : 'Default Markup %'}
        </label>
        <input
          type="number"
          value={defaultMarkup}
          onChange={(e) => onMarkupChange(Number(e.target.value))}
          className="input w-32"
          disabled={operatingCostMethod !== 'markup_over_rm'}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-brand mb-2">
          Default profit margin %
        </label>
        <input
          type="number"
          min={0}
          max={100}
          step={0.1}
          value={defaultProfitMarginPercent}
          onChange={(e) => onProfitMarginChange(Number(e.target.value))}
          className="input w-32"
          disabled={operatingCostMethod !== 'process_per_kg'}
        />
      </div>
    </>
  );
}
