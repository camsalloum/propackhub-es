import type { ReactNode } from 'react';
import CustomerAutocomplete from './CustomerAutocomplete';
import type { ProductTypeOption, UnitOption } from '../lib/masterDataReference';
import type { DimensionFieldDef } from '../lib/productCatalog';
import { selectOnFocus } from '../lib/inputs';
import type { ToolingScenario } from '../lib/tooling';

const fieldClass = 'input input-compact w-full min-w-0';
const numFieldClass = `${fieldClass} tabular-nums text-center`;
const labelClass = 'block text-xs font-medium text-navy mb-1 truncate';

const isExwDelivery = (term: string | null | undefined) =>
  !term || term.trim().toUpperCase() === 'EXW';

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
  skuLabel,
  onSkuLabelChange,
  brand,
  onBrandChange,
  specsCode,
  onSpecsCodeChange,
  printColorCount,
  onPrintColorCountChange,
  costPerColor,
  onCostPerColorChange,
  toolingBillingMode,
  onToolingBillingModeChange,
  toolingScenario,
  onToolingScenarioChange,
  billableColorCount,
  onBillableColorCountChange,
  effectiveToolingDisplay,
  colorsDriveTooling,
  toolingChargeUsd,
  onToolingChargeUsdChange,
  deliveryTerm,
  onDeliveryTermChange,
  deliveryChargeUsd,
  onDeliveryChargeUsdChange,
  showDeliveryFields = false,
  displayCurrency,
  showSkuFields = false,
  showDevCostFields = false,
}: {
  customerId: string;
  onCustomerChange: (id: string) => void;
  onCustomerDraftChange?: (companyName: string) => void;
  jobName?: string;
  onJobNameChange?: (name: string) => void;
  jobNamePlaceholder?: string;
  showJobName?: boolean;
  skuLabel?: string;
  onSkuLabelChange?: (v: string) => void;
  brand?: string;
  onBrandChange?: (v: string) => void;
  specsCode?: string;
  onSpecsCodeChange?: (v: string) => void;
  printColorCount?: number | null;
  onPrintColorCountChange?: (v: number | null) => void;
  costPerColor?: number | null;
  onCostPerColorChange?: (v: number | null) => void;
  toolingBillingMode?: 'amortized' | 'separate' | 'not_billed' | null;
  onToolingBillingModeChange?: (v: 'amortized' | 'separate' | 'not_billed') => void;
  toolingScenario?: ToolingScenario | null;
  onToolingScenarioChange?: (v: ToolingScenario) => void;
  billableColorCount?: number | null;
  onBillableColorCountChange?: (v: number | null) => void;
  effectiveToolingDisplay?: number;
  colorsDriveTooling?: boolean;
  toolingChargeUsd?: number;
  onToolingChargeUsdChange?: (v: number) => void;
  deliveryTerm?: string;
  onDeliveryTermChange?: (v: string) => void;
  deliveryChargeUsd?: number;
  onDeliveryChargeUsdChange?: (v: number) => void;
  showDeliveryFields?: boolean;
  displayCurrency?: string;
  showSkuFields?: boolean;
  showDevCostFields?: boolean;
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

  const topRowGridClass = showSkuFields
    ? showJobName && onJobNameChange != null
      ? 'lg:grid-cols-[minmax(9rem,1.225fr)_minmax(9rem,1.225fr)_minmax(5rem,0.5fr)_minmax(5.5rem,0.9fr)_minmax(5rem,0.55fr)]'
      : 'lg:grid-cols-[minmax(10rem,1.75fr)_minmax(5rem,0.5fr)_minmax(5.5rem,0.9fr)_minmax(5rem,0.55fr)]'
    : 'lg:grid-cols-[minmax(10rem,35%)_minmax(10rem,35%)]';

  const devCol = {
    tooling: 'minmax(5.5rem, 0.85fr)',
    printColors: 'minmax(4rem, 0.55fr)',
    changedColors: 'minmax(4rem, 0.5fr)',
    costPerColor: 'minmax(5rem, 0.72fr)',
    devTotal: 'minmax(5.5rem, 0.95fr)',
    devBilling: 'minmax(5.5rem, 0.85fr)',
    deliveryTerm: 'minmax(4.5rem, 0.65fr)',
    freight: 'minmax(4.5rem, 0.62fr)',
  };
  const isExistingTooling = toolingScenario === 'existing';
  const devRowColumns = [
    showDevCostFields ? devCol.tooling : null,
    showDevCostFields && !isExistingTooling ? devCol.printColors : null,
    showDevCostFields && toolingScenario === 'modification' ? devCol.changedColors : null,
    showDevCostFields && !isExistingTooling ? devCol.costPerColor : null,
    showDevCostFields && !isExistingTooling ? devCol.devTotal : null,
    showDevCostFields && !isExistingTooling ? devCol.devBilling : null,
    showDeliveryFields ? devCol.deliveryTerm : null,
    showDeliveryFields ? devCol.freight : null,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="space-y-3">
      <div className={`grid grid-cols-1 gap-x-3 gap-y-3 ${topRowGridClass}`}>
        <div className="min-w-0">
          <label className={labelClass}>Customer name</label>
          <CustomerAutocomplete
            value={customerId}
            onChange={onCustomerChange}
            onDraftChange={onCustomerDraftChange}
            compact
          />
        </div>

        {showJobName && onJobNameChange != null ? (
          <div className="min-w-0">
            <label className={labelClass}>Job name</label>
            <input
              type="text"
              placeholder={jobNamePlaceholder}
              className={fieldClass}
              value={jobName ?? ''}
              onChange={(e) => onJobNameChange(e.target.value)}
            />
          </div>
        ) : showSkuFields ? null : (
          <div className="hidden lg:block" aria-hidden />
        )}

        {showSkuFields && (
          <>
            <div className="min-w-0">
              <label className={labelClass}>SKU / size</label>
              <input
                type="text"
                className={fieldClass}
                value={skuLabel ?? ''}
                onChange={(e) => onSkuLabelChange?.(e.target.value)}
                placeholder="e.g. 200 ml"
              />
            </div>
            <div className="min-w-0">
              <label className={labelClass}>Brand</label>
              <input
                type="text"
                className={fieldClass}
                value={brand ?? ''}
                onChange={(e) => onBrandChange?.(e.target.value)}
              />
            </div>
            <div className="min-w-0">
              <label className={labelClass}>Specs / item code</label>
              <input
                type="text"
                className={fieldClass}
                value={specsCode ?? ''}
                onChange={(e) => onSpecsCodeChange?.(e.target.value)}
              />
            </div>
          </>
        )}
      </div>

      {(showDevCostFields || showDeliveryFields) && devRowColumns && (
        <div
          className="job-header-dev-row"
          style={{ ['--job-dev-cols' as string]: devRowColumns }}
        >
          {showDevCostFields && (
            <>
              <div className="min-w-0">
                <label className={labelClass}>Tooling</label>
                <select
                  className={fieldClass}
                  value={toolingScenario ?? 'new'}
                  onChange={(e) =>
                    onToolingScenarioChange?.(e.target.value as ToolingScenario)
                  }
                >
                  <option value="new">New</option>
                  <option value="existing">Existing</option>
                  <option value="modification">Modification</option>
                </select>
              </div>
              {!isExistingTooling && (
                <div className="min-w-0">
                  <label className={labelClass}>Print colors</label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    className={numFieldClass}
                    value={printColorCount ?? ''}
                    onChange={(e) => {
                      const raw = e.target.value;
                      onPrintColorCountChange?.(raw === '' ? null : Number(raw));
                    }}
                    onFocus={selectOnFocus}
                    title="Total colors on the job"
                  />
                </div>
              )}
              {toolingScenario === 'modification' && (
                <div className="min-w-0">
                  <label className={labelClass}>Changed colors</label>
                  <input
                    type="number"
                    min={0}
                    max={printColorCount ?? undefined}
                    step={1}
                    className={numFieldClass}
                    value={billableColorCount ?? ''}
                    onChange={(e) => {
                      const raw = e.target.value;
                      onBillableColorCountChange?.(raw === '' ? null : Number(raw));
                    }}
                    onFocus={selectOnFocus}
                    title={
                      printColorCount != null
                        ? `New/changed cylinders to charge (${printColorCount} total on job)`
                        : undefined
                    }
                  />
                </div>
              )}
              {toolingScenario !== 'existing' && (
                <div className="min-w-0">
                  <label className={labelClass}>Cost / color ({displayCurrency || 'USD'})</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    className={numFieldClass}
                    value={costPerColor ?? ''}
                    onChange={(e) => {
                      const raw = e.target.value;
                      onCostPerColorChange?.(raw === '' ? null : Number(raw));
                    }}
                    onFocus={selectOnFocus}
                  />
                </div>
              )}
              {!isExistingTooling && (
                <div className="min-w-0">
                  <label className={labelClass}>
                    {colorsDriveTooling ? 'Dev total' : 'Tooling charge'} ({displayCurrency || 'USD'})
                  </label>
                  {colorsDriveTooling ? (
                    <p className={`${numFieldClass} input-static`}>
                      {(effectiveToolingDisplay ?? 0).toFixed(2)}
                      {(toolingBillingMode ?? 'separate') === 'separate'
                        ? ' · sep'
                        : (toolingBillingMode ?? 'separate') === 'amortized'
                          ? ' · /kg'
                          : ' · n/b'}
                    </p>
                  ) : (
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      className={numFieldClass}
                      value={toolingChargeUsd ?? 0}
                      onChange={(e) => onToolingChargeUsdChange?.(Number(e.target.value) || 0)}
                      onFocus={selectOnFocus}
                    />
                  )}
                </div>
              )}
              {!isExistingTooling && (
                <div className="min-w-0">
                  <label className={labelClass}>Dev billing</label>
                  <select
                    className={fieldClass}
                    value={toolingBillingMode ?? 'separate'}
                    onChange={(e) =>
                      onToolingBillingModeChange?.(
                        e.target.value as 'amortized' | 'separate' | 'not_billed'
                      )
                    }
                  >
                    <option value="separate">Separate</option>
                    <option value="amortized">Amortized</option>
                    <option value="not_billed">Not billed</option>
                  </select>
                </div>
              )}
            </>
          )}
          {showDeliveryFields && (
            <>
              <div className="min-w-0">
                <label className={labelClass}>Delivery term</label>
                <select
                  className={fieldClass}
                  value={deliveryTerm ?? 'EXW'}
                  onChange={(e) => {
                    const next = e.target.value;
                    onDeliveryTermChange?.(next);
                    if (isExwDelivery(next)) onDeliveryChargeUsdChange?.(0);
                  }}
                >
                  {['EXW', 'FOB', 'CIF', 'CFR', 'DAP', 'DDP', 'Other'].map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-0">
                <label className={labelClass}>Freight (USD)</label>
                <input
                  type="number"
                  value={isExwDelivery(deliveryTerm) ? 0 : deliveryChargeUsd ?? 0}
                  step="0.01"
                  min={0}
                  disabled={isExwDelivery(deliveryTerm)}
                  onChange={(e) => onDeliveryChargeUsdChange?.(Number(e.target.value) || 0)}
                  onFocus={selectOnFocus}
                  className={numFieldClass}
                  title={
                    isExwDelivery(deliveryTerm)
                      ? 'EXW — no freight charge'
                      : undefined
                  }
                />
              </div>
            </>
          )}
        </div>
      )}

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
