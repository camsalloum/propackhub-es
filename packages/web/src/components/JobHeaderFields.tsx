import type { ReactNode } from 'react';
import CustomerAutocomplete from './CustomerAutocomplete';
import type { ProductTypeOption, UnitOption } from '../lib/masterDataReference';
import type { DimensionFieldDef } from '../lib/productCatalog';
import { selectOnFocus } from '../lib/inputs';

const fieldClass = 'input input-compact w-full min-w-0';
const labelClass = 'block text-xs font-medium text-navy mb-1 text-center truncate px-0.5';

function SpecField({
  label,
  title,
  className,
  children,
}: {
  label: string;
  title?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className ?? 'min-w-0'}>
      <label className={labelClass} title={title ?? label}>
        {label}
      </label>
      {children}
    </div>
  );
}

/**
 * Unified job header — customer, job name, then one full-width spec row.
 */
export function JobHeaderFields({
  customerId,
  onCustomerChange,
  onCustomerDraftChange,
  jobName,
  onJobNameChange,
  jobNamePlaceholder = 'e.g. Chips duplex laminate',
  showJobName = true,
  productType,
  onProductTypeChange,
  productTypeOptions,
  productTypeLocked = false,
  productSubtype,
  onProductSubtypeChange,
  subtypeLabel = 'Subtype',
  availableSubtypes = [],
  dimensionFields = [],
  dimensions = {},
  onDimensionChange,
  orderQuantity,
  onOrderQuantityChange,
  orderQuantityUnit,
  onOrderQuantityUnitChange,
  unitOptions,
  orderQuantityUnitMultiplier,
  onOrderQuantityUnitMultiplierChange,
  orderQuantityHint,
  dimensionHints,
  bagDimensionsPanel,
}: {
  customerId: string;
  onCustomerChange: (id: string) => void;
  onCustomerDraftChange?: (companyName: string) => void;
  jobName?: string;
  onJobNameChange?: (name: string) => void;
  jobNamePlaceholder?: string;
  showJobName?: boolean;
  productType?: string;
  onProductTypeChange?: (type: string) => void;
  productTypeOptions?: ProductTypeOption[];
  productTypeLocked?: boolean;
  productSubtype?: string | null;
  onProductSubtypeChange?: (subtype: string | null) => void;
  subtypeLabel?: string;
  availableSubtypes?: Array<{ code: string; label: string }>;
  dimensionFields?: DimensionFieldDef[];
  dimensions?: Record<string, number | undefined>;
  onDimensionChange?: (key: string, value: number) => void;
  orderQuantity?: number;
  onOrderQuantityChange?: (qty: number) => void;
  orderQuantityUnit?: string;
  onOrderQuantityUnitChange?: (unit: string) => void;
  unitOptions?: UnitOption[];
  /** Per-estimate length (e.g. LM) for units flagged `variableMultiplier` — e.g. a custom roll length. */
  orderQuantityUnitMultiplier?: number;
  onOrderQuantityUnitMultiplierChange?: (value: number) => void;
  /** Tooltip for the order-quantity input — e.g. the entered qty converted to every unit. */
  orderQuantityHint?: string;
  /** Per-dimension tooltips (key → text), e.g. reel width → resulting LM/kg & pcs/kg. */
  dimensionHints?: Record<string, string>;
  /** When set (bag configurator), replaces dimension field columns in the spec row. */
  bagDimensionsPanel?: ReactNode;
}) {
  const showProductType =
    productType != null && onProductTypeChange && productTypeOptions && productTypeOptions.length > 0;

  const showSubtype =
    availableSubtypes.length > 0 && onProductSubtypeChange != null;

  const showOrderQty =
    orderQuantity != null &&
    onOrderQuantityChange &&
    orderQuantityUnit != null &&
    onOrderQuantityUnitChange &&
    unitOptions &&
    unitOptions.length > 0;

  const selectedUnitOption = unitOptions?.find((o) => o.value === orderQuantityUnit);
  const showUnitMultiplier =
    showOrderQty && selectedUnitOption?.variableMultiplier === true && onOrderQuantityUnitMultiplierChange != null;

  const showDimensions =
    !bagDimensionsPanel && dimensionFields.length > 0 && onDimensionChange != null;

  const showSpecRow = showProductType || showSubtype || showOrderQty || showDimensions || bagDimensionsPanel;

  const productTypeLabel =
    productTypeOptions?.find((o) => o.value === productType)?.label ?? productType;

  const dimCount = dimensionFields.length;
  const rollLengthMissing =
    showUnitMultiplier &&
    !(Number.isFinite(orderQuantityUnitMultiplier) && (orderQuantityUnitMultiplier as number) > 0);
  const specGridStyle = {
    gridTemplateColumns: [
      showProductType ? 'minmax(5rem, 0.55fr)' : null,
      showSubtype ? 'minmax(12rem, 2.2fr)' : null,
      showOrderQty ? 'minmax(6.5rem, 0.75fr)' : null,
      // Wide enough for "Roll (custom length)" without clipping the closed select.
      showOrderQty ? 'minmax(11.5rem, 1.15fr)' : null,
      showUnitMultiplier ? 'minmax(6.5rem, 0.8fr)' : null,
      ...dimensionFields.map(() => 'minmax(5.75rem, 1fr)'),
    ]
      .filter(Boolean)
      .join(' '),
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-3">
        <div className="min-w-0">
          <label className="block text-xs font-medium text-navy mb-1">Customer name</label>
          <CustomerAutocomplete
            value={customerId}
            onChange={onCustomerChange}
            onDraftChange={onCustomerDraftChange}
            compact
          />
        </div>

        {showJobName && onJobNameChange != null ? (
          <div className="min-w-0">
            <label className="block text-xs font-medium text-navy mb-1">Job name</label>
            <input
              type="text"
              placeholder={jobNamePlaceholder}
              className={fieldClass}
              value={jobName ?? ''}
              onChange={(e) => onJobNameChange(e.target.value)}
            />
          </div>
        ) : (
          <div className="hidden lg:block" aria-hidden />
        )}
      </div>

      {showSpecRow && (
        <div className="border-t border-border/80 pt-3">
          <div
            className="grid w-full gap-x-3 gap-y-3 items-end max-xl:overflow-x-auto max-xl:pb-1"
            style={dimCount > 0 || showProductType ? specGridStyle : undefined}
          >
            {showProductType && (
              <SpecField label="Product type" title="Product type">
                {productTypeLocked ? (
                  <p
                    className="input input-compact input-static w-full text-navy font-medium text-center truncate"
                    title={productTypeLabel}
                  >
                    {productTypeLabel}
                  </p>
                ) : (
                  <select
                    value={productType}
                    onChange={(e) => onProductTypeChange(e.target.value)}
                    className={`${fieldClass} text-center`}
                  >
                    {productTypeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                )}
              </SpecField>
            )}

            {showSubtype && (
              <SpecField label={subtypeLabel} title={subtypeLabel}>
                <select
                  className={fieldClass}
                  value={productSubtype ?? ''}
                  onChange={(e) => onProductSubtypeChange(e.target.value || null)}
                >
                  <option value="">Select type…</option>
                  {availableSubtypes.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </SpecField>
            )}

            {showOrderQty && (
              <>
                <SpecField label="Order quantity" title={orderQuantityHint ?? 'Order quantity'}>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={Number.isFinite(orderQuantity) ? orderQuantity : ''}
                    onChange={(e) => onOrderQuantityChange(Number(e.target.value) || 0)}
                    onFocus={selectOnFocus}
                    title={orderQuantityHint}
                    className="input input-compact w-full text-center tabular-nums"
                  />
                </SpecField>
                <SpecField
                  label="Unit"
                  title={selectedUnitOption?.label ?? 'Unit'}
                >
                  <select
                    value={orderQuantityUnit}
                    onChange={(e) => onOrderQuantityUnitChange(e.target.value)}
                    className={`${fieldClass} text-left`}
                    title={selectedUnitOption?.label}
                  >
                    {unitOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </SpecField>
              </>
            )}

            {showUnitMultiplier && (
              <SpecField
                label="Roll length (LM) *"
                title="Length of one roll in linear metres — required for Roll (custom length)"
              >
                <input
                  type="number"
                  min={0}
                  step="any"
                  required
                  value={
                    Number.isFinite(orderQuantityUnitMultiplier) && (orderQuantityUnitMultiplier as number) > 0
                      ? orderQuantityUnitMultiplier
                      : ''
                  }
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') {
                      onOrderQuantityUnitMultiplierChange!(0);
                      return;
                    }
                    onOrderQuantityUnitMultiplierChange!(Number(raw) || 0);
                  }}
                  onFocus={selectOnFocus}
                  placeholder="e.g. 500"
                  className={`input input-compact w-full text-center tabular-nums ${
                    rollLengthMissing ? 'bg-warning-soft border-warning/40' : ''
                  }`}
                />
              </SpecField>
            )}

            {showDimensions &&
              dimensionFields.map((f) =>
                f.type === 'boolean' ? (
                  <label
                    key={f.key}
                    className="flex flex-col items-center justify-end gap-1 min-h-[52px] cursor-pointer"
                  >
                    <span className={labelClass}>{f.label}</span>
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={Number(dimensions[f.key]) === 1}
                      onChange={(e) => onDimensionChange(f.key, e.target.checked ? 1 : 0)}
                    />
                  </label>
                ) : (
                  <SpecField
                    key={f.key}
                    label={`${f.label}${f.unit ? ` (${f.unit})` : ''}${f.required ? ' *' : ''}`}
                    title={dimensionHints?.[f.key] ?? f.label}
                  >
                    <input
                      type="number"
                      inputMode="decimal"
                      className={`input input-compact w-full text-center tabular-nums ${
                        f.required && (dimensions[f.key] ?? 0) === 0
                          ? 'bg-warning-soft border-warning/40'
                          : ''
                      }`}
                      value={dimensions[f.key] ?? 0}
                      onChange={(e) => onDimensionChange(f.key, Number(e.target.value))}
                      onFocus={selectOnFocus}
                      title={dimensionHints?.[f.key]}
                    />
                  </SpecField>
                )
              )}
          </div>

          {bagDimensionsPanel && (
            <div className="mt-3 pt-3 border-t border-border/60 w-full">
              {bagDimensionsPanel}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
