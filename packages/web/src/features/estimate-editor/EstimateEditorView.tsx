import { Link } from 'react-router-dom';
import { Layers, Calculator } from 'lucide-react';
import { SkeletonCard, SkeletonTableRows } from '../../components/Skeleton';
import type { ProductFamily } from '../../lib/productCatalog';
import type { DimensionState, EstimateEditorProps, LayerItem } from './types';
import { EstimateEditorStickyHeader } from './sections/EstimateEditorStickyHeader';
import { EstimateEditorPricingPanels } from './sections/EstimateEditorPricingPanels';
import { EstimateEditorJobDetails } from './sections/EstimateEditorJobDetails';
import { EstimateEditorDimensionsSection } from './sections/EstimateEditorDimensionsSection';
import { EstimateEditorStructureSection } from './sections/EstimateEditorStructureSection';
import { EstimateEditorPriceListSection } from './sections/EstimateEditorPriceListSection';
import { EstimateEditorMobilePriceBar } from './sections/EstimateEditorMobilePriceBar';
import { EstimateEditorDialogs } from './sections/EstimateEditorDialogs';
import { EstimateEditorNotices } from './sections/EstimateEditorNotices';
import { useEstimateEditorController } from './hooks/useEstimateEditorController';
import { ConfirmProcessesModal } from '../../components/ConfirmProcessesModal';
import type { EstimateProcessRow } from '../../components/EstimateProcessesPanel';

const EstimateEditor = (props: EstimateEditorProps = {}) => {
  const ctrl = useEstimateEditorController(props);

  if (ctrl.phase === 'loading') {
    return (
      <div className="p-8 space-y-6 max-w-5xl" aria-busy="true" aria-label="Loading estimate">
        <SkeletonCard />
        <SkeletonTableRows rows={6} />
      </div>
    );
  }

  if (ctrl.phase === 'error') {
    return (
      <div className="p-8 max-w-lg mx-auto card bg-danger/10 border border-danger/30 text-center">
        <p className="text-danger font-medium">{ctrl.loadError}</p>
        <div className="flex flex-col gap-2 mt-4">
          <button type="button" className="btn-primary" onClick={ctrl.onRetry}>
            Retry
          </button>
          <Link to={ctrl.returnTo} className="text-gold hover:underline text-sm">Back</Link>
        </div>
      </div>
    );
  }

  if (ctrl.phase === 'missing') {
    return <div className="p-8">Estimate not found</div>;
  }

  const {
    PRODUCT_FAMILY_LABELS,
    accessories,
    accessoryMaterialOptions,
    activeSection,
    addLayerOfType,
    addLayerSheetOpen,
    adhesiveLayerCount,
    allowedUnitBases,
    availableSubtypes,
    availableUnitOptions,
    bagConfiguratorActive,
    baseCormDisplay,
    billableColorCount,
    brand,
    can,
    canConfigureSolvent,
    canEditLayerStructure,
    canOverrideOperatingCostMethod,
    centeredStructureColKeys,
    changeStatus,
    clientCalcResult,
    colorsDriveTooling,
    configuratorTypeForBagSubtype,
    configuratorTypeForPouchSubtype,
    consumablesTotalPerKgUsd,
    consumablesTotalPerM2Usd,
    cormScaleWithWaste,
    costPerColor,
    costingBlocksProps,
    customerId,
    defaultOrderQuantityUnit,
    defaultSubtypeForFamily,
    deliveryChargeUsd,
    deliveryTerm,
    densityForMaterial,
    dimensionHints,
    dimensions,
    displayCurrencyLabel,
    displaySalePrice,
    downloadProposalPdf,
    downloadStoredProposal,
    dragFromIndex,
    dragHoverIndex,
    editingLayer,
    editorError,
    effectiveToolingDisplay,
    embedded,
    estimate,
    estimationDimensionFields,
    formulaModalLayer,
    formulaModalLayerId,
    formulaModalRecipe,
    fxRate,
    goToSection,
    handleCancel,
    handleCustomizeProcesses,
    handleRequote,
    handleSaveAsTemplate,
    handleSaveDraft,
    handleSaveFinal,
    handleSnapBack,
    hideEstimateRef,
    hidePriceListTab,
    isDirty,
    isLabelsRoll,
    isPriceCheck,
    jobName,
    laminationRecipeOverrides,
    layerSheetOpen,
    layers,
    leaveConfirmOpen,
    loadBaseData,
    loadError,
    marginValuePerKgUsd,
    markupPercent,
    masterReference,
    materials,
    maxAdhesives,
    maxSubstrates,
    mobileStackOpen,
    moqKg,
    multiOnQuote,
    navigate,
    needsConfiguration,
    normalizeLoadedProcesses,
    normalizeUnitValue,
    openLayerEdit,
    operatingCostMethod,
    orderQtyMetrics,
    orderQuantity,
    orderQuantityHint,
    orderQuantityUnit,
    packagingTotalPerKgUsd,
    packagingTotalPerM2Usd,
    pendingTemplateName,
    pouchConfiguratorActive,
    priceChanges,
    pricingMethod,
    printColorCount,
    processesState,
    productFamily,
    productSubtype,
    productTypeOptions,
    profitMarginPercent,
    proposals,
    readOnly,
    renderInkControlsCell,
    renderMaterialOptions,
    reorderLayers,
    requiresRollLength,
    requoteWarnings,
    returnTo,
    rmTotals,
    rollConfiguratorActive,
    runSnapBack,
    saveNotice,
    saving,
    seedBagDimensionPatch,
    seedPouchDimensionPatchForSubtype,
    sellingPricesByUnit,
    setAccessories,
    setAddLayerSheetOpen,
    setBillableColorCount,
    setBrand,
    setCormPerKgPlain,
    setCormPerKgUsd,
    setCostPerColor,
    setCustomerDraftName,
    setCustomerId,
    setDeliveryChargeUsd,
    setDeliveryTerm,
    setDimensions,
    setDragFromIndex,
    setDragHoverIndex,
    setEditingLayerId,
    setEditorError,
    setFormulaModalLayerId,
    setJobName,
    setLaminationRecipeOverrides,
    setLayerSheetOpen,
    setLayers,
    setLeaveConfirmOpen,
    setMarkupPercent,
    setMobileStackOpen,
    setOperatingCostMethodOverride,
    setOrderQuantity,
    setOrderQuantityUnit,
    setPriceChanges,
    setPrintColorCount,
    setProcessesState,
    setProductSubtype,
    setProductType,
    setProfitMarginPercent,
    setSaveNotice,
    setSnapBackConfirmOpen,
    setSpecsCode,
    setTemplateOpenConfirmOpen,
    setTemplatePromptOpen,
    setToolingBillingMode,
    setToolingChargeUsd,
    setToolingScenario,
    showInkControlsCol,
    showLayerControlsCol,
    showStructureCosts,
    skuLabel,
    setSkuLabel,
    sleeveConfiguratorActive,
    snapBackConfirmOpen,
    solventTotalPerM2Usd,
    specsCode,
    stackLabel,
    structureColumns,
    structureDensity,
    structureGridStyle,
    structureHasPrinting,
    structureLocked,
    structureMetrics,
    structureTableHeight,
    structureTableRef,
    submitSaveAsTemplate,
    substrateLayerCount,
    templateClassification,
    templateCormRef,
    templateOpenConfirmOpen,
    templatePromptOpen,
    tenant,
    tenantMarkupPercent,
    tenantOperatingCostMethod,
    tenantProfitMarginPercent,
    toolingBillingMode,
    toolingChargeUsd,
    toolingScenario,
    totalConstructionMicron,
    totalGsm,
    unitOptions,
    visualizerLayers,
    wasteBands,
    wastePrintMode,
    webConfiguratorActive,
    yieldSqmPerKg,
    processesStale,
    processesConfirmOpen,
    pendingProcesses,
    setPendingProcesses,
    processesDiffLines,
    confirmProcesses,
    cancelProcessesConfirm,
    rederiveFromStructure,
    clientStructureForked,
    clientProcessesCustomized,
  } = ctrl;

  return (
    <div className="w-full pb-24 md:pb-0">
      <EstimateEditorNotices
        loadError={loadError}
        onRetryMaterials={loadBaseData}
        saveNotice={saveNotice}
        onDismissSaveNotice={() => setSaveNotice(null)}
        editorError={editorError}
        onDismissEditorError={() => setEditorError(null)}
        priceChanges={priceChanges}
        onDismissPriceChanges={() => setPriceChanges([])}
        requoteWarnings={requoteWarnings}
      />

      <EstimateEditorStickyHeader
        embedded={embedded}
        isDirty={isDirty}
        hideEstimateRef={hideEstimateRef}
        estimate={{
          ...estimate,
          structureForked: clientStructureForked,
          processesCustomized: clientProcessesCustomized,
        }}
        needsConfiguration={needsConfiguration}
        isPriceCheck={isPriceCheck}
        multiOnQuote={multiOnQuote}
        skuLabel={skuLabel}
        jobName={jobName}
        readOnly={readOnly}
        saving={saving}
        onCancel={handleCancel}
        onSnapBack={handleSnapBack}
        onSaveDraft={handleSaveDraft}
        onSaveFinal={handleSaveFinal}
        onDownloadPdf={downloadProposalPdf}
        onSaveAsTemplate={handleSaveAsTemplate}
        onRequote={handleRequote}
      />

      <fieldset
        disabled={readOnly}
        className="min-w-0 border-0 p-0 m-0 disabled:opacity-90 [&_button:not([type='button'])]:disabled:pointer-events-none"
      >
      <EstimateEditorJobDetails
        isPriceCheck={isPriceCheck}
        multiOnQuote={multiOnQuote}
        estimateRefNumber={estimate?.refNumber}
        customerId={customerId}
        onCustomerChange={(id) => {
          setCustomerId(id);
          setCustomerDraftName('');
        }}
        onCustomerDraftChange={setCustomerDraftName}
        jobName={jobName}
        onJobNameChange={setJobName}
        productFamily={productFamily}
        onProductTypeChange={(next) => {
          setProductType(next);
          setProductSubtype(next === 'bag' || next === 'pouch' ? null : defaultSubtypeForFamily(next as ProductFamily));
          const nextUnit = defaultOrderQuantityUnit({
            productType: next,
            sourceTemplateKey: estimate?.sourceTemplateKey,
            jobName,
            dimensions: dimensions as Record<string, unknown>,
          });
          if (nextUnit === 'kpcs') {
            setOrderQuantityUnit(normalizeUnitValue('kpcs', unitOptions));
          }
        }}
        productTypeOptions={productTypeOptions}
        productTypeLocked={structureLocked || readOnly}
        productSubtype={productSubtype}
        onProductSubtypeChange={(next) => {
          setProductSubtype(next);
          const nextBagType = configuratorTypeForBagSubtype(next);
          if (productFamily === 'bag' && nextBagType) {
            setDimensions((prev: DimensionState) => ({
              ...prev,
              ...seedBagDimensionPatch(nextBagType, prev),
            }));
          }
          const nextPouchType = configuratorTypeForPouchSubtype(next);
          if (productFamily === 'pouch' && nextPouchType) {
            setDimensions((prev: DimensionState) => ({
              ...prev,
              ...seedPouchDimensionPatchForSubtype(next, prev),
            }));
          }
        }}
        subtypeLabel={(PRODUCT_FAMILY_LABELS[productFamily] ?? productFamily) + ' type'}
        availableSubtypes={availableSubtypes}
        dimensionFields={
          productFamily === 'pouch' || productFamily === 'bag' || webConfiguratorActive
            ? []
            : estimationDimensionFields
        }
        dimensions={dimensions}
        onDimensionChange={(key, value) =>
          setDimensions((prev: DimensionState) => ({ ...prev, [key]: value }))
        }
        orderQuantity={orderQuantity}
        onOrderQuantityChange={setOrderQuantity}
        orderQuantityUnit={orderQuantityUnit}
        onOrderQuantityUnitChange={setOrderQuantityUnit}
        unitOptions={availableUnitOptions}
        orderQuantityUnitMultiplier={dimensions.orderUnitMultiplier}
        onOrderQuantityUnitMultiplierChange={(value) =>
          setDimensions((prev: DimensionState) => ({ ...prev, orderUnitMultiplier: value }))
        }
        orderQuantityHint={orderQuantityHint}
        dimensionHints={dimensionHints}
        bagDimensionsPanel={
          <EstimateEditorDimensionsSection
            bagConfiguratorActive={bagConfiguratorActive}
            pouchConfiguratorActive={pouchConfiguratorActive}
            rollConfiguratorActive={rollConfiguratorActive}
            sleeveConfiguratorActive={sleeveConfiguratorActive}
            productSubtype={productSubtype}
            dimensions={dimensions}
            onDimensionsChange={(patch) =>
              setDimensions((prev: DimensionState) => ({ ...prev, ...patch } as DimensionState))
            }
            accessories={accessories}
            onAccessoriesChange={setAccessories}
            accessoryMaterials={accessoryMaterialOptions}
            totalGsm={totalGsm}
            filmDensityGcm3={structureMetrics.structureDensity ?? 0}
            isLabelsRoll={isLabelsRoll}
            continuousWeb={!structureHasPrinting}
          />
        }
        showSkuFields={!isPriceCheck}
        showVariantField={isPriceCheck && multiOnQuote}
        skuLabel={skuLabel}
        onSkuLabelChange={setSkuLabel}
        brand={brand}
        onBrandChange={setBrand}
        specsCode={specsCode}
        onSpecsCodeChange={setSpecsCode}
        showDevCostFields={!isPriceCheck && can('platesPerKg') && structureHasPrinting}
        printColorCount={printColorCount}
        onPrintColorCountChange={setPrintColorCount}
        costPerColor={costPerColor}
        onCostPerColorChange={setCostPerColor}
        toolingScenario={toolingScenario}
        onToolingScenarioChange={(next) => {
          setToolingScenario(next);
          if (next === 'existing') setBillableColorCount(0);
          else if (next === 'new') setBillableColorCount(null);
        }}
        billableColorCount={billableColorCount}
        onBillableColorCountChange={setBillableColorCount}
        toolingBillingMode={toolingBillingMode}
        onToolingBillingModeChange={setToolingBillingMode}
        effectiveToolingDisplay={effectiveToolingDisplay}
        colorsDriveTooling={colorsDriveTooling}
        toolingChargeUsd={toolingChargeUsd}
        onToolingChargeUsdChange={setToolingChargeUsd}
        showDeliveryFields={!isPriceCheck && can('markupPercent')}
        deliveryTerm={deliveryTerm}
        onDeliveryTermChange={setDeliveryTerm}
        deliveryChargeUsd={deliveryChargeUsd}
        onDeliveryChargeUsdChange={setDeliveryChargeUsd}
        displayCurrency={estimate?.displayCurrency || 'USD'}
      />

      <div className="min-w-0 max-w-full overflow-x-hidden">
        <div>
          {!hidePriceListTab && (
            <div className="flex space-x-2 mb-6 overflow-x-auto">
              <button onClick={() => goToSection('structure')} className={`flex items-center space-x-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors duration-micro ease-micro ${activeSection === 'structure' ? 'bg-accent-soft text-accent-text font-medium' : 'hover:bg-surface-base text-text-primary'}`}>
                <Layers className="w-4 h-4" /><span>Structure</span>
              </button>
              <button onClick={() => goToSection('slabs')} className={`flex items-center space-x-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors duration-micro ease-micro ${activeSection === 'slabs' ? 'bg-accent-soft text-accent-text font-medium' : 'hover:bg-surface-base text-text-primary'}`}>
                <Calculator className="w-4 h-4" /><span>Price list</span>
              </button>
            </div>
          )}

          <EstimateEditorStructureSection
            activeSection={activeSection}
            hidePriceListTab={hidePriceListTab}
            structureLocked={structureLocked}
            stackLabel={stackLabel}
            layers={layers}
            setLayers={setLayers}
            materials={materials}
            mobileStackOpen={mobileStackOpen}
            setMobileStackOpen={setMobileStackOpen}
            visualizerLayers={visualizerLayers}
            totalConstructionMicron={totalConstructionMicron}
            totalGsm={totalGsm}
            displayCurrencyLabel={displayCurrencyLabel}
            showStructureCosts={showStructureCosts}
            canMaterialCostPerKg={can('materialCostPerKg')}
            fxRate={fxRate}
            displayCurrency={estimate?.displayCurrency || 'USD'}
            openLayerEdit={openLayerEdit}
            canConfigureSolvent={canConfigureSolvent}
            laminationRecipeOverrides={laminationRecipeOverrides}
            setFormulaModalLayerId={setFormulaModalLayerId}
            canEditLayerStructure={canEditLayerStructure}
            dragFromIndex={dragFromIndex}
            setDragFromIndex={setDragFromIndex}
            dragHoverIndex={dragHoverIndex}
            setDragHoverIndex={setDragHoverIndex}
            reorderLayers={reorderLayers}
            setAddLayerSheetOpen={setAddLayerSheetOpen}
            costingBlocksProps={costingBlocksProps}
            structureTableRef={structureTableRef}
            structureGridStyle={structureGridStyle}
            structureColumns={structureColumns}
            centeredStructureColKeys={centeredStructureColKeys}
            templateClassification={templateClassification}
            clientCalcResult={clientCalcResult}
            showLayerControlsCol={showLayerControlsCol}
            showInkControlsCol={showInkControlsCol}
            renderInkControlsCell={renderInkControlsCell}
            rmTotals={rmTotals}
            structureTableHeight={structureTableHeight}
            substrateLayerCount={substrateLayerCount}
            adhesiveLayerCount={adhesiveLayerCount}
            maxSubstrates={maxSubstrates}
            maxAdhesives={maxAdhesives}
            processesState={processesState}
            processOptions={masterReference.processOptions}
            setProcessesState={setProcessesState}
            normalizeLoadedProcesses={normalizeLoadedProcesses}
            estimateProcessesCustomized={clientProcessesCustomized}
            estimateStructureForked={clientStructureForked}
            handleCustomizeProcesses={handleCustomizeProcesses}
            processesStale={processesStale}
            onRederiveProcesses={rederiveFromStructure}
            yieldProps={{
              clientCalcResult,
              yieldSqmPerKg,
              orderQtyMetrics,
              canFilmDensity: can('filmDensity'),
              canRmCostPerKg: can('rmCostPerKg'),
              canCostPerSqm: can('costPerSqm'),
              totalConstructionMicron,
              totalGsm,
              structureDensity,
              productFamily,
              structureHasPrinting,
              rmTotals,
              displayCurrency: estimate?.displayCurrency || 'USD',
              fxRate,
            }}
          />

          <EstimateEditorPriceListSection
            hidePriceListTab={hidePriceListTab}
            activeSection={activeSection}
            clientCalcResult={clientCalcResult}
            totalGsm={totalGsm}
            orderQtyMetrics={orderQtyMetrics}
            dimensions={dimensions}
            allowedUnitBases={allowedUnitBases}
            requiresRollLength={requiresRollLength}
            wasteBands={wasteBands}
            pricingMethod={pricingMethod}
            markupPercent={markupPercent}
            marginValuePerKgDisplay={marginValuePerKgUsd}
            estimateFxRate={fxRate}
            estimateDisplayCurrency={estimate?.displayCurrency || 'USD'}
            operatingCostMethod={operatingCostMethod}
            tenantOperatingCostMethod={tenant?.operatingCostMethod}
            profitMarginPercent={profitMarginPercent}
            baseCormDisplay={baseCormDisplay}
            cormScaleWithWaste={cormScaleWithWaste}
            moqKg={moqKg}
          />

        </div>

        <EstimateEditorPricingPanels
          activeSection={activeSection}
          canCostBreakdown={can('costBreakdown')}
          sellingPricesByUnit={sellingPricesByUnit}
          costBreakdown={{
            estimate: clientCalcResult?.estimate,
            layers,
            materials,
            solventTotalPerM2Usd,
            packagingTotalPerKgUsd,
            packagingTotalPerM2Usd,
            consumablesTotalPerKgUsd,
            consumablesTotalPerM2Usd,
            displayCurrency: estimate?.displayCurrency || 'USD',
            fxRate,
            reelWidthMm: dimensions?.reelWidthMm ?? 0,
            rollLengthLm: Number(dimensions?.orderUnitMultiplier) || 0,
            allowedUnitBases,
            requiresRollLength,
            operatingCostMethod,
            tenantOperatingCostMethod: tenantOperatingCostMethod ?? 'markup_over_rm',
            cormPerKgDisplay: baseCormDisplay,
            markupPercent,
            profitMarginPercent,
            canOverrideMethod: canOverrideOperatingCostMethod,
            readOnly,
            fallbackSalePerKg: Number(estimate?.salePricePerKg) || 0,
            onMethodChange: (method) => {
              setOperatingCostMethodOverride(method);
              if (method === 'process_per_kg') {
                setProfitMarginPercent((prev: number) =>
                  Number.isFinite(prev) ? prev : tenantProfitMarginPercent
                );
              } else if (method === 'markup_over_rm') {
                setMarkupPercent((prev: number) =>
                  Number.isFinite(prev) && prev > 0 ? prev : tenantMarkupPercent
                );
              }
            },
            onCormChange: (value) => {
              const n = Number.isFinite(value) && value >= 0 ? value : 0;
              if (wastePrintMode === 'printed') setCormPerKgUsd(n);
              else setCormPerKgPlain(n);
            },
            onMarkupChange: (pct) => {
              setMarkupPercent(Number.isFinite(pct) && pct >= 0 ? pct : tenantMarkupPercent);
            },
            onProfitMarginChange: setProfitMarginPercent,
            onResetToTenantDefault: () => {
              setOperatingCostMethodOverride(null);
              setProfitMarginPercent(tenantProfitMarginPercent);
              setMarkupPercent(tenantMarkupPercent);
              setCormPerKgUsd(templateCormRef.current.printed);
              setCormPerKgPlain(templateCormRef.current.plain);
            },
          }}
          estimateStatus={estimate?.status}
          proposals={proposals}
          isPriceCheck={isPriceCheck}
          onMarkWon={() => changeStatus('won')}
          onMarkLost={() => changeStatus('lost')}
          onDownloadStoredProposal={downloadStoredProposal}
        />
      </div>

      <EstimateEditorMobilePriceBar
        activeSection={activeSection}
        displaySalePrice={displaySalePrice}
        displayCurrency={estimate?.displayCurrency || 'USD'}
        readOnly={readOnly}
        saving={saving}
        onSaveDraft={handleSaveDraft}
        onSaveFinal={handleSaveFinal}
      />
      </fieldset>

      <EstimateEditorDialogs
        leaveConfirmOpen={leaveConfirmOpen}
        onLeaveConfirm={() => {
          setLeaveConfirmOpen(false);
          navigate(returnTo);
        }}
        onLeaveCancel={() => setLeaveConfirmOpen(false)}
        snapBackConfirmOpen={snapBackConfirmOpen}
        saving={saving}
        onSnapBackConfirm={() => {
          setSnapBackConfirmOpen(false);
          void runSnapBack();
        }}
        onSnapBackCancel={() => setSnapBackConfirmOpen(false)}
        templatePromptOpen={templatePromptOpen}
        templateDefaultName={jobName || estimate.jobName || ''}
        onTemplatePromptConfirm={(name) => void submitSaveAsTemplate(name)}
        onTemplatePromptCancel={() => setTemplatePromptOpen(false)}
        templateOpenConfirmOpen={templateOpenConfirmOpen}
        pendingTemplateName={pendingTemplateName}
        onTemplateOpenConfirm={() => {
          setTemplateOpenConfirmOpen(false);
          navigate('/my-templates');
        }}
        onTemplateOpenCancel={() => setTemplateOpenConfirmOpen(false)}
        layerSheetOpen={layerSheetOpen}
        editingLayer={editingLayer}
        onCloseLayerSheet={() => {
          setLayerSheetOpen(false);
          setEditingLayerId(null);
        }}
        materials={materials}
        onUpdateLayer={(layerId, patch) => {
          setLayers((prev: LayerItem[]) => prev.map((l: LayerItem) => (l.id === layerId ? { ...l, ...patch } : l)));
        }}
        renderMaterialOptions={renderMaterialOptions}
        densityForMaterial={densityForMaterial}
        canConfigureSolvent={canConfigureSolvent}
        laminationRecipeOverrides={laminationRecipeOverrides}
        onOpenFormulaFromLayerSheet={(layerId) => {
          setLayerSheetOpen(false);
          setFormulaModalLayerId(layerId);
        }}
        addLayerSheetOpen={addLayerSheetOpen}
        onCloseAddLayerSheet={() => setAddLayerSheetOpen(false)}
        structureLocked={structureLocked}
        onAddLayerOfType={addLayerOfType}
        formulaModalLayerId={formulaModalLayerId}
        formulaModalLayer={formulaModalLayer}
        formulaModalRecipe={formulaModalRecipe}
        onCloseFormulaModal={() => setFormulaModalLayerId(null)}
        onSaveFormula={(recipe) => {
          if (!formulaModalLayerId) return;
          setLaminationRecipeOverrides((prev: Record<string, import("@es/engine").LaminationRecipe>) => ({ ...prev, [formulaModalLayerId]: recipe }));
        }}
      />

      <ConfirmProcessesModal
        open={processesConfirmOpen}
        diffLines={processesDiffLines}
        processes={pendingProcesses as EstimateProcessRow[]}
        processOptions={masterReference.processOptions}
        onChange={(rows) => setPendingProcesses(rows)}
        onConfirm={(rows, edited) => confirmProcesses(rows, edited)}
        onCancel={cancelProcessesConfirm}
      />
    </div>
  );
};

export default EstimateEditor;
