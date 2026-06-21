import CustomerAutocomplete from './CustomerAutocomplete';
import type { ProductTypeOption, ProductTypeValue, UnitOption } from '../lib/masterDataReference';

const fieldClass = 'input input-compact w-full min-w-0';

/**
 * Excel-style 2×2 job header — equal columns, no stray max-width hacks.
 * Row 1: Customer | Job name
 * Row 2: Product type | Order qty + unit
 */
export function JobHeaderFields({
  customerId,
  onCustomerChange,
  jobName,
  onJobNameChange,
  jobNamePlaceholder = 'e.g. Chips duplex laminate',
  showJobName = true,
  productType,
  onProductTypeChange,
  productTypeOptions,
  orderQuantity,
  onOrderQuantityChange,
  orderQuantityUnit,
  onOrderQuantityUnitChange,
  unitOptions,
}: {
  customerId: string;
  onCustomerChange: (id: string) => void;
  jobName?: string;
  onJobNameChange?: (name: string) => void;
  jobNamePlaceholder?: string;
  showJobName?: boolean;
  productType?: ProductTypeValue;
  onProductTypeChange?: (type: ProductTypeValue) => void;
  productTypeOptions?: ProductTypeOption[];
  orderQuantity?: number;
  onOrderQuantityChange?: (qty: number) => void;
  orderQuantityUnit?: string;
  onOrderQuantityUnitChange?: (unit: string) => void;
  unitOptions?: UnitOption[];
}) {
  const showProductType =
    productType != null && onProductTypeChange && productTypeOptions && productTypeOptions.length > 0;

  const showOrderQty =
    orderQuantity != null &&
    onOrderQuantityChange &&
    orderQuantityUnit != null &&
    onOrderQuantityUnitChange &&
    unitOptions &&
    unitOptions.length > 0;

  return (
    <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
      <div className="min-w-0">
        <label className="block text-xs font-medium text-navy mb-1">Customer name</label>
        <CustomerAutocomplete value={customerId} onChange={onCustomerChange} compact />
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
        <div className="hidden sm:block" aria-hidden />
      )}

      {showProductType && (
        <div className="min-w-0">
          <label className="block text-xs font-medium text-navy mb-1">Product type</label>
          <select
            value={productType}
            onChange={(e) => onProductTypeChange(e.target.value as ProductTypeValue)}
            className={fieldClass}
          >
            {productTypeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {showOrderQty && (
        <div className="min-w-0">
          <label className="block text-xs font-medium text-navy mb-1">Order quantity</label>
          <div className="grid grid-cols-[minmax(0,1fr)_5.5rem] gap-2">
            <input
              type="number"
              min={0}
              step={1}
              value={Number.isFinite(orderQuantity) ? orderQuantity : ''}
              onChange={(e) => onOrderQuantityChange(Number(e.target.value) || 0)}
              className={`${fieldClass} text-right tabular-nums`}
            />
            <select
              value={orderQuantityUnit}
              onChange={(e) => onOrderQuantityUnitChange(e.target.value)}
              className={fieldClass}
            >
              {unitOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
