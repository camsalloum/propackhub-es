import type { CSSProperties, Dispatch, ReactNode, Ref, SetStateAction } from 'react';
import { GripVertical } from 'lucide-react';
import LayerCard from '../../../components/LayerCard';
import FilmStackVisualizer from '../../../components/FilmStackVisualizer';
import { EstimateProcessesPanel } from '../../../components/EstimateProcessesPanel';
import StructureGradeSelect from '../../../components/StructureGradeSelect';
import { SectionTitle } from '../../../components/SectionTitle';
import { usdToDisplay, usdToDisplayPrecise } from '../../../lib/currency';
import { formatMicronDisplay } from '../../../lib/formatMicron';
import { layerFieldsFromMaterial } from '../../../lib/materialNominalMicron';
import { selectOnFocus } from '../../../lib/inputs';
import { materialAllowedForTemplateLayer } from '@es/engine';
import { StructureCostingBlocks } from '../StructureCostingBlocks';
import { EstimateEditorYieldAndOrder, type EstimateEditorYieldAndOrderProps } from './EstimateEditorYieldAndOrder';
import { LAYER_TYPE_LABELS, LAYER_TYPE_TABLE_LABELS } from '../constants';
import type { LayerItem, MaterialItem } from '../types';
import type { LaminationRecipe } from '@es/engine';
import type { RmTotals } from './EstimateEditorYieldAndOrder';

export type StructureColumn = { key: string; track: string; label: ReactNode };

export type EstimateEditorStructureSectionProps = {
  activeSection: 'structure' | 'dimensions' | 'slabs';
  hidePriceListTab: boolean;
  structureLocked: boolean;
  stackLabel: string;
  layers: LayerItem[];
  setLayers: Dispatch<SetStateAction<LayerItem[]>>;
  materials: MaterialItem[];
  mobileStackOpen: boolean;
  setMobileStackOpen: Dispatch<SetStateAction<boolean>>;
  visualizerLayers: Parameters<typeof FilmStackVisualizer>[0]['layers'];
  totalConstructionMicron: number | null | undefined;
  totalGsm: number;
  displayCurrencyLabel: string;
  showStructureCosts: boolean;
  canMaterialCostPerKg: boolean;
  fxRate: number;
  displayCurrency: string;
  openLayerEdit: (layerId: string) => void;
  canConfigureSolvent: boolean;
  laminationRecipeOverrides: Record<string, LaminationRecipe>;
  setFormulaModalLayerId: (id: string | null) => void;
  canEditLayerStructure: (layer: { materialType: string }) => boolean;
  dragFromIndex: number | null;
  setDragFromIndex: Dispatch<SetStateAction<number | null>>;
  dragHoverIndex: number | null;
  setDragHoverIndex: Dispatch<SetStateAction<number | null>>;
  reorderLayers: (from: number, to: number) => void;
  setAddLayerSheetOpen: (open: boolean) => void;
  costingBlocksProps: Omit<Parameters<typeof StructureCostingBlocks>[0], 'variant'>;
  structureTableRef: Ref<HTMLDivElement>;
  structureGridStyle: CSSProperties;
  structureColumns: StructureColumn[];
  centeredStructureColKeys: Set<string>;
  templateClassification: Parameters<typeof materialAllowedForTemplateLayer>[2] | null | undefined;
  clientCalcResult: { estimate: { layers: Array<{ costPerM2?: number | null }> } } | null | undefined;
  showLayerControlsCol: boolean;
  showInkControlsCol: boolean;
  renderInkControlsCell: (idx: number, layer: { id: string; materialType: string }) => ReactNode;
  rmTotals: RmTotals | null | undefined;
  structureTableHeight: number | null;
  substrateLayerCount: number;
  adhesiveLayerCount: number;
  maxSubstrates: number;
  maxAdhesives: number;
  processesState: Parameters<typeof EstimateProcessesPanel>[0]['processes'];
  processOptions: Parameters<typeof EstimateProcessesPanel>[0]['processOptions'];
  setProcessesState: Dispatch<SetStateAction<Parameters<typeof EstimateProcessesPanel>[0]['processes']>>;
  normalizeLoadedProcesses: (rows: any[]) => Parameters<typeof EstimateProcessesPanel>[0]['processes'];
  estimateProcessesCustomized: boolean;
  estimateStructureForked: boolean;
  handleCustomizeProcesses: () => void;
  processesStale?: boolean;
  onRederiveProcesses?: () => void;
  yieldProps: EstimateEditorYieldAndOrderProps;
};

/** Structure tab — desktop grid, mobile cards, add-layer, processes, yield summary. */
export function EstimateEditorStructureSection(props: EstimateEditorStructureSectionProps) {
  const {
    activeSection,
    hidePriceListTab,
    structureLocked,
    stackLabel,
    layers,
    setLayers,
    materials,
    mobileStackOpen,
    setMobileStackOpen,
    visualizerLayers,
    totalConstructionMicron,
    totalGsm,
    displayCurrencyLabel,
    showStructureCosts,
    canMaterialCostPerKg,
    fxRate,
    displayCurrency,
    openLayerEdit,
    canConfigureSolvent,
    laminationRecipeOverrides,
    setFormulaModalLayerId,
    canEditLayerStructure,
    dragFromIndex,
    setDragFromIndex,
    dragHoverIndex,
    setDragHoverIndex,
    reorderLayers,
    setAddLayerSheetOpen,
    costingBlocksProps,
    structureTableRef,
    structureGridStyle,
    structureColumns,
    centeredStructureColKeys,
    templateClassification,
    clientCalcResult,
    showLayerControlsCol,
    showInkControlsCol,
    renderInkControlsCell,
    rmTotals,
    structureTableHeight,
    substrateLayerCount,
    adhesiveLayerCount,
    maxSubstrates,
    maxAdhesives,
    processesState,
    processOptions,
    setProcessesState,
    normalizeLoadedProcesses,
    estimateProcessesCustomized,
    estimateStructureForked,
    handleCustomizeProcesses,
    processesStale = false,
    onRederiveProcesses,
    yieldProps,
  } = props;

  if (!(activeSection === 'structure' || hidePriceListTab)) return null;

  return (
    <>
<div className="space-y-6">
  <div className="card p-0 overflow-hidden shadow-md">
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] border-b border-border bg-surface-raised">
      <div className="px-5 py-3.5 xl:border-r border-border">
        <SectionTitle
          as="h3"
          className="text-lg font-display font-semibold text-navy tracking-tight"
          hint={
            structureLocked
              ? 'Template quote — films & adhesives are fixed; edit grades, thickness (µ/gsm), costs, and ink & coating rows'
              : 'Layers, grades & RM costs'
          }
        >
          {stackLabel}
        </SectionTitle>
        {layers.length > 1 && (
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-mist">
            <GripVertical className="w-3.5 h-3.5" />
            {structureLocked ? 'Drag the handle to reorder ink & coating' : 'Drag the handle to reorder layers'}
          </p>
        )}
      </div>
      <div className="px-5 py-3.5 hidden xl:block border-l border-border bg-slate/20">
        <SectionTitle
          as="h3"
          className="text-lg font-display font-semibold text-navy tracking-tight"
          hint="Cross-section · up to 4 films, 3 adhesives, unlimited ink & coating"
        >
          Layer build-up
        </SectionTitle>
      </div>
    </div>
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] xl:items-start">
      <div className="min-w-0 xl:border-r border-border">
    {/* Mobile cards + bottom sheets (PRD §5.8) */}
    <div className="space-y-3 md:hidden pb-24">
      <button
        type="button"
        onClick={() => setMobileStackOpen((v) => !v)}
        className="w-full flex items-center justify-between p-3 bg-slate rounded-lg text-sm font-medium text-navy"
      >
        <span>Layer build-up</span>
        <span>{mobileStackOpen ? '▲' : '▼'}</span>
      </button>
      {mobileStackOpen && (
        <div className="py-2">
          <FilmStackVisualizer
            layers={visualizerLayers}
            totalMicron={totalConstructionMicron}
            displayCurrency={displayCurrencyLabel}
            showContrib={showStructureCosts}
          />
        </div>
      )}
      {layers.map((layer, idx) => {
        const costPerKgDisplay = canMaterialCostPerKg 
          ? usdToDisplay(layer.costPerKgUsd, fxRate) 
          : undefined;
        return (
        <LayerCard
          key={layer.id}
          index={idx}
          layer={{ ...layer, type: layer.materialType, material: layer.materialName, costPerKg: costPerKgDisplay }}
          showCost={canMaterialCostPerKg}
          displayCurrency={displayCurrency}
          onEdit={() => openLayerEdit(layer.id)}
          showFormula={canConfigureSolvent && layer.materialType === 'adhesive' && layer.isSolventBased}
          formulaOverridden={!!laminationRecipeOverrides[layer.id]}
          onFormula={
            canConfigureSolvent && layer.materialType === 'adhesive' && layer.isSolventBased
              ? () => setFormulaModalLayerId(layer.id)
              : undefined
          }
          onRemove={canEditLayerStructure(layer) ? () => setLayers((prev) => prev.filter((l) => l.id !== layer.id)) : undefined}
          onDragStart={canEditLayerStructure(layer) ? (i) => setDragFromIndex(i) : undefined}
          onDragEnter={(i) => {
            if (dragFromIndex !== null && canEditLayerStructure(layers[dragFromIndex])) {
              setDragHoverIndex(i);
            }
          }}
          onDragEnd={() => {
            if (dragFromIndex !== null && dragHoverIndex !== null) {
              const dragged = layers[dragFromIndex];
              if (!structureLocked || dragged?.materialType === 'ink') {
                reorderLayers(dragFromIndex, dragHoverIndex);
              }
            }
            setDragFromIndex(null);
            setDragHoverIndex(null);
          }}
          isDragging={dragFromIndex === idx}
        />
        );
      })}
      <button
        type="button"
        onClick={() => setAddLayerSheetOpen(true)}
        className="w-full min-h-[48px] py-3 border-2 border-dashed border-border rounded-xl font-display font-semibold text-navy"
      >
        {structureLocked ? '+ Add ink & coating' : '+ Add layer'}
      </button>
      <StructureCostingBlocks variant="mobile" {...costingBlocksProps} />
    </div>

    {/* Desktop structure grid — one column definition for header + every row */}
    <div ref={structureTableRef} className="hidden md:block overflow-x-auto min-w-0 p-4 pr-6">
      <div className="structure-grid text-sm" style={structureGridStyle} role="table">
        <div className="structure-grid__row" role="row">
          {structureColumns.map((col) => (
            <div
              key={col.key}
              className={`structure-grid__cell structure-grid__cell--head${
                centeredStructureColKeys.has(col.key)
                  ? ' structure-grid__cell--head-center'
                  : ''
              }`}
              role="columnheader"
            >
              {col.label}
            </div>
          ))}
        </div>
          {layers.map((layer, idx) => (
            <div
              key={layer.id}
              role="row"
              onDragEnter={() => {
                if (dragFromIndex !== null && canEditLayerStructure(layers[dragFromIndex])) {
                  setDragHoverIndex(idx);
                }
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (dragFromIndex !== null && dragHoverIndex !== null) {
                  const dragged = layers[dragFromIndex];
                  if (!structureLocked || dragged?.materialType === 'ink') {
                    reorderLayers(dragFromIndex, dragHoverIndex);
                  }
                }
                setDragFromIndex(null);
                setDragHoverIndex(null);
              }}
              className={`structure-grid__row hover:bg-slate/50 transition-colors ${
                dragFromIndex === idx ? 'opacity-50' : ''
              } ${
                dragHoverIndex === idx && dragFromIndex !== null && dragFromIndex !== idx
                  ? 'bg-brand/5 outline outline-1 outline-brand/40'
                  : ''
              }`}
            >
              <div className="structure-grid__cell text-xs text-mist" role="cell">
                <div className="flex items-center gap-0.5 min-w-0 w-full">
                  {canEditLayerStructure(layer) && (
                    <span
                      draggable
                      onDragStart={() => setDragFromIndex(idx)}
                      onDragEnd={() => {
                        if (dragFromIndex !== null && dragHoverIndex !== null) {
                          const dragged = layers[dragFromIndex];
                          if (!structureLocked || dragged?.materialType === 'ink') {
                            reorderLayers(dragFromIndex, dragHoverIndex);
                          }
                        }
                        setDragFromIndex(null);
                        setDragHoverIndex(null);
                      }}
                      className="inline-flex shrink-0 items-center justify-center rounded p-0.5 text-mist hover:text-brand hover:bg-brand/10 cursor-grab active:cursor-grabbing touch-none transition-colors"
                      aria-label="Drag to reorder layer"
                      title="Drag to reorder"
                    >
                      <GripVertical className="w-3.5 h-3.5" />
                    </span>
                  )}
                  <span className="tabular-nums">{idx + 1}</span>
                </div>
              </div>
              <div className="structure-grid__cell" role="cell">
                <span
                  className={`inline-block text-xs px-1.5 py-0.5 rounded-md whitespace-nowrap ${layer.materialType === 'substrate' ? 'bg-brand/10 text-brand' : layer.materialType === 'ink' ? 'bg-accent/10 text-accent-text' : 'bg-success/10 text-success'}`}
                  title={LAYER_TYPE_LABELS[layer.materialType] || layer.materialType}
                >
                  {LAYER_TYPE_TABLE_LABELS[layer.materialType] || layer.materialType}
                </span>
              </div>
              <div className="structure-grid__cell overflow-hidden" role="cell">
                {/* Family dropdown — filtered by template classification (PE → PE only, Non PE → no PE) */}
                {(() => {
                  const currentMat = materials.find(m => m.id === layer.materialId);
                  const currentFamily = currentMat?.substrateFamily ?? null;

                  if (layer.materialType !== 'substrate') {
                    // Ink/adhesive: show family dropdown (Solvent Based, UV-LED, etc.)
                    const inkFamilies = [...new Set(
                      materials
                        .filter(m => m.type === layer.materialType && m.substrateFamily)
                        .map(m => m.substrateFamily!)
                    )].sort();

                    if (inkFamilies.length === 0) {
                      return <span className="text-sm text-mist truncate block" title={currentFamily ?? ''}>{currentFamily || '—'}</span>;
                    }

                    return (
                      <select
                        className="cell-input w-full text-xs text-left truncate"
                        title={currentFamily ?? ''}
                        value={currentFamily ?? ''}
                        onChange={(e) => {
                          const newFamily = e.target.value;
                          // Auto-select first material in the new family
                          const firstInFamily = materials.find(m =>
                            m.type === layer.materialType && m.substrateFamily === newFamily
                          );
                          if (firstInFamily) {
                            setLayers(prev => prev.map(l => l.id === layer.id ? {
                              ...l,
                              ...layerFieldsFromMaterial(layer.materialType, l.micron, firstInFamily),
                            } : l));
                          }
                        }}
                      >
                        {inkFamilies.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    );
                  }

                  // Build allowed families using the engine's substrateFamilyAllowed rule
                  const allowedFamilies = [...new Set(
                    materials
                      .filter(m => m.type === 'substrate' && m.substrateFamily)
                      .filter(m => !templateClassification || materialAllowedForTemplateLayer(m, 'substrate', templateClassification))
                      .map(m => m.substrateFamily!)
                  )].sort();

                  return (
                    <select
                      className="cell-input w-full text-xs text-left truncate"
                      title={currentFamily ?? ''}
                      value={currentFamily ?? ''}
                      onChange={(e) => {
                        const newFamily = e.target.value;
                        // Auto-select first allowed grade in the new family
                        const firstInFamily = materials.find(m =>
                          m.type === 'substrate' &&
                          m.substrateFamily === newFamily &&
                          (!templateClassification || materialAllowedForTemplateLayer(m, 'substrate', templateClassification))
                        );
                        if (firstInFamily) {
                          setLayers(prev => prev.map(l => l.id === layer.id ? {
                            ...l,
                            ...layerFieldsFromMaterial(layer.materialType, l.micron, firstInFamily),
                          } : l));
                        }
                      }}
                    >
                      {allowedFamilies.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  );
                })()}
              </div>
              <div className="structure-grid__cell overflow-hidden" role="cell">
                {/* Grade dropdown — filtered by family + classification; title shows hoover on hover */}
                {(() => {
                  const currentMat = materials.find(m => m.id === layer.materialId);
                  const currentFamily = currentMat?.substrateFamily ?? null;

                  // Allowed grades: must pass layer type + classification + family filter
                  const gradeOptions = materials.filter(m => {
                    if (m.type !== layer.materialType) return false;
                    if (layer.materialType === 'substrate') {
                      if (templateClassification && !materialAllowedForTemplateLayer(m, 'substrate', templateClassification)) return false;
                    }
                    // Family filter applies to ALL layer types (substrate, ink, adhesive)
                    if (currentFamily && m.substrateFamily !== currentFamily) return false;
                    return true;
                  });

                  const solidPct = currentMat?.solidPercent ?? 100;
                  const solidBasisTitle =
                    solidPct < 100
                      ? `Cost/kg is solid basis (${solidPct}% solid). Wet ink cost is higher; solvent is costed separately.`
                      : undefined;

                  return (
                    <div className="min-w-0 w-full" title={solidBasisTitle}>
                    <StructureGradeSelect
                      value={layer.materialId}
                      options={gradeOptions.map((m) => ({
                        id: m.id,
                        name: m.name,
                        hoover: m.hoover ?? null,
                      }))}
                      onChange={(materialId) => {
                        const mat = materials.find((m) => m.id === materialId);
                        if (!mat) return;
                        setLayers((prev) =>
                          prev.map((l) =>
                            l.id === layer.id
                              ? {
                                  ...l,
                                  ...layerFieldsFromMaterial(layer.materialType, l.micron, mat),
                                }
                              : l
                          )
                        );
                      }}
                    />
                    </div>
                  );
                })()}
              </div>

              <div className="structure-grid__cell structure-grid__cell--col-center" role="cell">
                {(() => {
                  const mat = materials.find(m => m.id === layer.materialId);
                  const solidPct = mat?.solidPercent ?? 100;
                  const density = parseFloat(mat?.density ?? '0.9') || 0.9;
                  const isSubstrate = layer.materialType === 'substrate';
                  const unitLabel = isSubstrate ? 'µ' : 'gsm';
                  const tooltip = isSubstrate
                    ? `Density: ${density.toFixed(3)} g/cm³`
                    : `Solid content: ${solidPct}%`;
                  return (
                    <div
                      className={`structure-grid__field w-full ${layer.micron === 0 ? 'border-warning/30 bg-warning/10' : ''}`}
                    >
                      <input
                        type="number"
                        value={parseFloat(layer.micron.toFixed(1))}
                        step="0.1"
                        title={tooltip}
                        onChange={(e) => {
                          const micron = Number(e.target.value);
                          setLayers((prev) => prev.map((l) => l.id === layer.id ? {
                            ...l, micron,
                            gsm: isSubstrate ? micron * density : micron,
                          } : l));
                        }}
                        inputMode="decimal"
                        onFocus={selectOnFocus}
                      />
                      <span className="text-xs text-mist shrink-0">{unitLabel}</span>
                    </div>
                  );
                })()}
              </div>

              <div className="structure-grid__cell font-mono text-xs font-semibold text-navy tabular-nums" role="cell">
                {layer.gsm > 0 ? layer.gsm.toFixed(2) : <span className="text-mist">0.00</span>}
              </div>

              {showStructureCosts && (
                <>
                  <div className="structure-grid__cell" role="cell">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      title={
                        layer.materialType === 'ink' &&
                        (materials.find((m) => m.id === layer.materialId)?.solidPercent ?? 100) <
                          100
                          ? `Cost/kg is solid basis (${materials.find((m) => m.id === layer.materialId)?.solidPercent}% solid). Wet ink cost is higher; solvent is costed separately.`
                          : undefined
                      }
                      value={usdToDisplay(layer.costPerKgUsd, fxRate).toFixed(2)}
                      onChange={(e) => {
                        const displayVal = parseFloat(e.target.value) || 0;
                        const usd = fxRate > 0 ? displayVal / fxRate : displayVal;
                        setLayers((prev) => prev.map((l) =>
                          l.id === layer.id ? { ...l, costPerKgUsd: usd } : l
                        ));
                      }}
                      className="cell-input font-mono text-[11px] text-right"
                      inputMode="decimal"
                      aria-label={`Cost per kg for ${layer.materialName}`}
                      onFocus={selectOnFocus}
                    />
                  </div>
                  <div className="structure-grid__cell font-mono text-[11px] tabular-nums text-navy" role="cell">
                    {(() => {
                      const calcLayer = clientCalcResult?.estimate.layers[idx];
                      const c = calcLayer?.costPerM2;
                      if (c == null || c <= 0) return <span className="text-mist">—</span>;
                      return usdToDisplayPrecise(c, fxRate).toFixed(4);
                    })()}
                  </div>
                </>
              )}

              {showLayerControlsCol && (
              <div className="structure-grid__cell" role="cell">
                {showInkControlsCol
                  ? renderInkControlsCell(idx, layer)
                  : canEditLayerStructure(layer) && (
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => setLayers((prev) => prev.filter((l) => l.id !== layer.id))}
                      className="p-1 text-mist hover:text-danger text-xs"
                      title="Remove"
                      aria-label="Remove layer"
                    >✕</button>
                    {canConfigureSolvent && layer.materialType === 'adhesive' && layer.isSolventBased && (
                      <button
                        type="button"
                        className="p-1 text-[10px] text-accent-text hover:text-accent"
                        onClick={() => setFormulaModalLayerId(layer.id)}
                        title="Lamination formula"
                      >
                        {laminationRecipeOverrides[layer.id] ? 'F*' : 'F'}
                      </button>
                    )}
                  </div>
                )}
              </div>
              )}
            </div>
          ))}
          <StructureCostingBlocks variant="desktop" {...costingBlocksProps} />
        <div className="structure-grid__row border-t-2 border-border bg-slate/40" role="row">
          <div className="structure-grid__cell py-3" role="cell" />
          <div className="structure-grid__cell py-3" role="cell" />
          <div className="structure-grid__cell py-3" role="cell" />
          <div className="structure-grid__cell py-3 text-xs font-bold text-navy" role="cell">
            Total
          </div>
          <div
            className="structure-grid__cell structure-grid__cell--col-center py-3"
            title="Total structure (µ) — substrate µ + ink/adhesive dry gsm ÷ density."
            role="cell"
          >
            <span className="font-mono text-xs font-bold text-navy tabular-nums">
              {totalConstructionMicron != null && totalConstructionMicron > 0
                ? `${formatMicronDisplay(totalConstructionMicron)} µ`
                : '—'}
            </span>
          </div>
          <div className="structure-grid__cell py-3 font-mono text-xs font-bold text-navy tabular-nums" role="cell">
            {totalGsm.toFixed(2)}
          </div>
          {showStructureCosts && (
            <>
              <div className="structure-grid__cell py-3 font-mono text-[11px] font-bold text-navy tabular-nums" role="cell">
                {rmTotals
                  ? usdToDisplayPrecise(rmTotals.totalRmPerKg, fxRate).toFixed(4)
                  : '—'}
              </div>
              <div className="structure-grid__cell py-3 font-mono text-[11px] font-bold text-navy tabular-nums" role="cell">
                {rmTotals
                  ? usdToDisplayPrecise(rmTotals.totalRmPerM2, fxRate).toFixed(4)
                  : '—'}
              </div>
            </>
          )}
          {showLayerControlsCol && <div className="structure-grid__cell py-3" role="cell" />}
        </div>
      </div>
    </div> {/* end hidden md:block */}

    <div className="hidden md:block xl:hidden border-t border-border bg-surface-raised px-4 py-3">
      <FilmStackVisualizer
        layers={visualizerLayers}
        totalMicron={totalConstructionMicron}
        className="w-full"
        displayCurrency={displayCurrencyLabel}
        showContrib={showStructureCosts}
      />
    </div>
      </div> {/* end table column — self-sized, no stretch gap */}

      <div
        className="hidden xl:block overflow-hidden bg-surface-raised border-l border-border"
        style={
          structureTableHeight != null
            ? { height: structureTableHeight, maxHeight: structureTableHeight }
            : undefined
        }
      >
        <FilmStackVisualizer
          layers={visualizerLayers}
          totalMicron={totalConstructionMicron}
          className="h-full w-full"
          displayCurrency={displayCurrencyLabel}
          showContrib={showStructureCosts}
        />
      </div>
    </div> {/* end structure body row */}
  </div> {/* end unified structure card */}

  {!structureLocked && (
  <div className="flex flex-wrap gap-3 items-center">
    <select className="input w-48" onChange={(e) => {
        const type = e.target.value as 'substrate' | 'ink' | 'adhesive';
        if (!type) return;
        if (type === 'substrate' && substrateLayerCount >= maxSubstrates) return;
        if (type === 'adhesive' && adhesiveLayerCount >= maxAdhesives) return;
        const defaultMat = materials.find(m => m.type === type);
        const micron = type === 'substrate' ? 25 : 2;
        const newLayer: LayerItem = { id: crypto.randomUUID(), materialId: defaultMat?.id || '', materialName: defaultMat?.name || 'Select material', materialType: type, micron, gsm: type === 'substrate' ? micron * (defaultMat?.density ? parseFloat(defaultMat.density) : 0.9) : micron, costPerKgUsd: defaultMat ? parseFloat(defaultMat.costPerKgUsd) : 0, isSolventBased: defaultMat?.isSolventBased || false, position: layers.length, hoover: defaultMat?.hoover || null };
        setLayers((prev) => [...prev, newLayer]);
        e.target.value = '';
      }} defaultValue="">
        <option value="" disabled>+ Add Layer...</option>
        <option value="substrate" disabled={substrateLayerCount >= maxSubstrates}>
          Substrate{substrateLayerCount >= maxSubstrates ? ` (max ${maxSubstrates})` : ''}
        </option>
        <option value="ink">Ink & Coating</option>
        <option value="adhesive" disabled={adhesiveLayerCount >= maxAdhesives}>
          Adhesive{adhesiveLayerCount >= maxAdhesives ? ` (max ${maxAdhesives})` : ''}
        </option>
      </select>
  </div>
  )}

  {/* Template quotes: processes come from the template — no panel.
      Scratch builds: user must pick steps here before slabs/pricing. */}
  {!structureLocked && (
    <>
      {processesStale && onRederiveProcesses ? (
        <div className="flex justify-end">
          <button type="button" className="btn-secondary text-sm" onClick={onRederiveProcesses}>
            Re-derive processes
          </button>
        </div>
      ) : null}
      <EstimateProcessesPanel
        processes={processesState}
        processOptions={processOptions}
        layerCount={layers.length}
        hint="Define which manufacturing steps apply to this job before quantity slabs and pricing."
        onChange={(rows) => setProcessesState(normalizeLoadedProcesses(rows))}
        isCustomized={estimateProcessesCustomized}
        structureForked={estimateStructureForked}
        onCustomize={handleCustomizeProcesses}
      />
    </>
  )}
              <EstimateEditorYieldAndOrder {...yieldProps} />
            </div>
    </>
  );
}
