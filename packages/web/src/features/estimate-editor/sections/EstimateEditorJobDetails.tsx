import type { ReactNode } from 'react';
import { JobHeaderFields } from '../../../components/JobHeaderFields';
import { SectionTitle } from '../../../components/SectionTitle';
import type { ProductTypeOption, UnitOption } from '../../../lib/masterDataReference';
import type { DimensionFieldDef } from '../../../lib/productCatalog';
import type { ToolingScenario } from '../../../lib/tooling';

export type EstimateEditorJobDetailsProps = {
  isPriceCheck: boolean;
  multiOnQuote: boolean;
  estimateRefNumber?: string | null;
  customerId: string;
  onCustomerChange: (id: string) => void;
  onCustomerDraftChange: (name: string) => void;
  jobName: string;
  onJobNameChange: (name: string) => void;
  productFamily: string;
  onProductTypeChange: (next: string) => void;
  productTypeOptions: ProductTypeOption[];
  productTypeLocked: boolean;
  productSubtype: string | null;
  onProductSubtypeChange: (next: string | null) => void;
  subtypeLabel: string;
  availableSubtypes: Array<{ code: string; label: string }>;
  dimensionFields: DimensionFieldDef[];
  dimensions: Record<string, number | undefined>;
  onDimensionChange: (key: string, value: number) => void;
  orderQuantity: number;
  onOrderQuantityChange: (qty: number) => void;
  orderQuantityUnit: string;
  onOrderQuantityUnitChange: (unit: string) => void;
  unitOptions: UnitOption[];
  orderQuantityUnitMultiplier: number | undefined;
  onOrderQuantityUnitMultiplierChange: (value: number) => void;
  orderQuantityHint?: string;
  dimensionHints?: Record<string, string> | undefined;
  bagDimensionsPanel?: ReactNode;
  showSkuFields: boolean;
  showVariantField: boolean;
  skuLabel: string;
  onSkuLabelChange: (v: string) => void;
  brand: string;
  onBrandChange: (v: string) => void;
  specsCode: string;
  onSpecsCodeChange: (v: string) => void;
  showDevCostFields: boolean;
  printColorCount: number | null;
  onPrintColorCountChange: (n: number | null) => void;
  costPerColor: number | null;
  onCostPerColorChange: (n: number | null) => void;
  toolingScenario: ToolingScenario;
  onToolingScenarioChange: (next: ToolingScenario) => void;
  billableColorCount: number | null;
  onBillableColorCountChange: (n: number | null) => void;
  toolingBillingMode: 'amortized' | 'separate' | 'not_billed' | null;
  onToolingBillingModeChange: (mode: 'amortized' | 'separate' | 'not_billed') => void;
  effectiveToolingDisplay: number;
  colorsDriveTooling: boolean;
  toolingChargeUsd: number;
  onToolingChargeUsdChange: (n: number) => void;
  showDeliveryFields: boolean;
  deliveryTerm: string;
  onDeliveryTermChange: (term: string) => void;
  deliveryChargeUsd: number;
  onDeliveryChargeUsdChange: (n: number) => void;
  displayCurrency: string;
};

/** Job details / product group card with JobHeaderFields. */
export function EstimateEditorJobDetails(props: EstimateEditorJobDetailsProps) {
  const {
    isPriceCheck,
    multiOnQuote,
    estimateRefNumber,
    ...fields
  } = props;

  return (
    <div className="card mb-6 py-3 px-4 sm:px-5">
      <SectionTitle
        as="h3"
        className="text-sm font-semibold text-brand mb-3"
        hint={
          isPriceCheck && !multiOnQuote
            ? `Price check ${estimateRefNumber || 'draft'} — name the product group. Save draft to keep working, or Save when pricing is ready.`
            : !isPriceCheck
              ? `Estimate ${estimateRefNumber || 'draft'} — pick an existing customer, click + Add customer for a new one. Use Save draft to keep working later, or Save when the estimate is complete. It appears under Estimates and on that customer's page.`
              : undefined
        }
      >
        {isPriceCheck ? 'Product group' : 'Job details'}
      </SectionTitle>
      <JobHeaderFields
        hideCustomer={isPriceCheck}
        jobNameLabel={isPriceCheck ? 'Product group' : 'Job name'}
        jobNamePlaceholder={isPriceCheck ? 'e.g. Triplex laminate — snack' : undefined}
        customerId={fields.customerId}
        onCustomerChange={fields.onCustomerChange}
        onCustomerDraftChange={fields.onCustomerDraftChange}
        jobName={fields.jobName}
        onJobNameChange={fields.onJobNameChange}
        productType={fields.productFamily}
        onProductTypeChange={fields.onProductTypeChange}
        productTypeOptions={fields.productTypeOptions}
        productTypeLocked={fields.productTypeLocked}
        productSubtype={fields.productSubtype}
        onProductSubtypeChange={fields.onProductSubtypeChange}
        subtypeLabel={fields.subtypeLabel}
        availableSubtypes={fields.availableSubtypes}
        dimensionFields={fields.dimensionFields}
        dimensions={fields.dimensions}
        onDimensionChange={fields.onDimensionChange}
        orderQuantity={fields.orderQuantity}
        onOrderQuantityChange={fields.onOrderQuantityChange}
        orderQuantityUnit={fields.orderQuantityUnit}
        onOrderQuantityUnitChange={fields.onOrderQuantityUnitChange}
        unitOptions={fields.unitOptions}
        orderQuantityUnitMultiplier={fields.orderQuantityUnitMultiplier}
        onOrderQuantityUnitMultiplierChange={fields.onOrderQuantityUnitMultiplierChange}
        orderQuantityHint={fields.orderQuantityHint}
        dimensionHints={fields.dimensionHints}
        bagDimensionsPanel={fields.bagDimensionsPanel}
        showSkuFields={fields.showSkuFields}
        showVariantField={fields.showVariantField}
        skuLabel={fields.skuLabel}
        onSkuLabelChange={fields.onSkuLabelChange}
        brand={fields.brand}
        onBrandChange={fields.onBrandChange}
        specsCode={fields.specsCode}
        onSpecsCodeChange={fields.onSpecsCodeChange}
        showDevCostFields={fields.showDevCostFields}
        printColorCount={fields.printColorCount}
        onPrintColorCountChange={fields.onPrintColorCountChange}
        costPerColor={fields.costPerColor}
        onCostPerColorChange={fields.onCostPerColorChange}
        toolingScenario={fields.toolingScenario}
        onToolingScenarioChange={fields.onToolingScenarioChange}
        billableColorCount={fields.billableColorCount}
        onBillableColorCountChange={fields.onBillableColorCountChange}
        toolingBillingMode={fields.toolingBillingMode}
        onToolingBillingModeChange={fields.onToolingBillingModeChange}
        effectiveToolingDisplay={fields.effectiveToolingDisplay}
        colorsDriveTooling={fields.colorsDriveTooling}
        toolingChargeUsd={fields.toolingChargeUsd}
        onToolingChargeUsdChange={fields.onToolingChargeUsdChange}
        showDeliveryFields={fields.showDeliveryFields}
        deliveryTerm={fields.deliveryTerm}
        onDeliveryTermChange={fields.onDeliveryTermChange}
        deliveryChargeUsd={fields.deliveryChargeUsd}
        onDeliveryChargeUsdChange={fields.onDeliveryChargeUsdChange}
        displayCurrency={fields.displayCurrency}
      />
    </div>
  );
}
