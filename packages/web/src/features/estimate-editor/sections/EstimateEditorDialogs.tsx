import type { ReactNode } from 'react';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { PromptDialog } from '../../../components/PromptDialog';
import BottomSheet from '../../../components/BottomSheet';
import LaminationFormulaModal from '../../../components/LaminationFormulaModal';
import { selectOnFocus } from '../../../lib/inputs';
import { layerFieldsFromMaterial } from '../../../lib/materialNominalMicron';
import { LAYER_TYPE_LABELS } from '../constants';
import type { LayerItem, MaterialItem } from '../types';
import type { LaminationRecipe } from '@es/engine';

export type EstimateEditorDialogsProps = {
  leaveConfirmOpen: boolean;
  onLeaveConfirm: () => void;
  onLeaveCancel: () => void;
  snapBackConfirmOpen: boolean;
  saving: boolean;
  onSnapBackConfirm: () => void;
  onSnapBackCancel: () => void;
  templatePromptOpen: boolean;
  templateDefaultName: string;
  onTemplatePromptConfirm: (name: string) => void;
  onTemplatePromptCancel: () => void;
  templateOpenConfirmOpen: boolean;
  pendingTemplateName: string;
  onTemplateOpenConfirm: () => void;
  onTemplateOpenCancel: () => void;
  layerSheetOpen: boolean;
  editingLayer: LayerItem | null;
  onCloseLayerSheet: () => void;
  materials: MaterialItem[];
  onUpdateLayer: (layerId: string, patch: Partial<LayerItem>) => void;
  renderMaterialOptions: (layerType: string) => ReactNode;
  densityForMaterial: (materialId: string) => number;
  canConfigureSolvent: boolean;
  laminationRecipeOverrides: Record<string, LaminationRecipe>;
  onOpenFormulaFromLayerSheet: (layerId: string) => void;
  addLayerSheetOpen: boolean;
  onCloseAddLayerSheet: () => void;
  structureLocked: boolean;
  onAddLayerOfType: (type: 'substrate' | 'ink' | 'adhesive') => void;
  formulaModalLayerId: string | null;
  formulaModalLayer: LayerItem | null;
  formulaModalRecipe: LaminationRecipe | null | undefined;
  onCloseFormulaModal: () => void;
  onSaveFormula: (recipe: LaminationRecipe) => void;
};

/** Confirm/prompt dialogs, layer bottom sheets, and lamination formula modal. */
export function EstimateEditorDialogs({
  leaveConfirmOpen,
  onLeaveConfirm,
  onLeaveCancel,
  snapBackConfirmOpen,
  saving,
  onSnapBackConfirm,
  onSnapBackCancel,
  templatePromptOpen,
  templateDefaultName,
  onTemplatePromptConfirm,
  onTemplatePromptCancel,
  templateOpenConfirmOpen,
  pendingTemplateName,
  onTemplateOpenConfirm,
  onTemplateOpenCancel,
  layerSheetOpen,
  editingLayer,
  onCloseLayerSheet,
  materials,
  onUpdateLayer,
  renderMaterialOptions,
  densityForMaterial,
  canConfigureSolvent,
  laminationRecipeOverrides,
  onOpenFormulaFromLayerSheet,
  addLayerSheetOpen,
  onCloseAddLayerSheet,
  structureLocked,
  onAddLayerOfType,
  formulaModalLayerId,
  formulaModalLayer,
  formulaModalRecipe,
  onCloseFormulaModal,
  onSaveFormula,
}: EstimateEditorDialogsProps) {
  return (
    <>
      <ConfirmDialog
        open={leaveConfirmOpen}
        title="Discard unsaved changes?"
        message="You have unsaved edits. Leave without saving?"
        confirmLabel="Discard"
        cancelLabel="Stay"
        destructive
        onConfirm={onLeaveConfirm}
        onCancel={onLeaveCancel}
      />
      <ConfirmDialog
        open={snapBackConfirmOpen}
        title="Revert to template?"
        message="This resets layers and processes to the template defaults. Current edits will be lost."
        confirmLabel="Revert"
        cancelLabel="Cancel"
        destructive
        busy={saving}
        onConfirm={onSnapBackConfirm}
        onCancel={onSnapBackCancel}
      />
      <PromptDialog
        open={templatePromptOpen}
        title="Save to My Templates"
        message="Reusable structure for future estimates."
        label="Template name"
        defaultValue={templateDefaultName}
        confirmLabel="Save template"
        onConfirm={onTemplatePromptConfirm}
        onCancel={onTemplatePromptCancel}
      />
      <ConfirmDialog
        open={templateOpenConfirmOpen}
        title="Template saved"
        message={`Structure "${pendingTemplateName}" is in My Templates. Open My Templates now?`}
        confirmLabel="Open My Templates"
        cancelLabel="Stay here"
        onConfirm={onTemplateOpenConfirm}
        onCancel={onTemplateOpenCancel}
      />

      <BottomSheet
        open={layerSheetOpen && !!editingLayer}
        onClose={onCloseLayerSheet}
        title="Edit layer"
        footer={
          <button
            type="button"
            className="btn-primary w-full min-h-[48px]"
            onClick={onCloseLayerSheet}
          >
            Done
          </button>
        }
      >
        {editingLayer && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-navy mb-2">Material</label>
              <select
                value={editingLayer.materialId}
                onChange={(e) => {
                  const mat = materials.find((m) => m.id === e.target.value);
                  if (!mat) return;
                  onUpdateLayer(editingLayer.id, {
                    ...layerFieldsFromMaterial(editingLayer.materialType, editingLayer.micron, mat),
                  });
                }}
                className="input w-full min-h-[48px]"
              >
                <option value="">Select material</option>
                {renderMaterialOptions(editingLayer.materialType)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-navy mb-2">Micron (µ)</label>
              <input
                type="number"
                inputMode="decimal"
                pattern="[0-9]*"
                value={editingLayer.micron}
                onChange={(e) => {
                  const micron = Number(e.target.value);
                  const isSubstrate = editingLayer.materialType === 'substrate';
                  onUpdateLayer(editingLayer.id, {
                    micron,
                    gsm: isSubstrate ? micron * densityForMaterial(editingLayer.materialId) : micron,
                  });
                }}
                onFocus={selectOnFocus}
                className="input w-full min-h-[48px] font-mono text-lg"
              />
            </div>
            <p className="text-sm text-mist">
              GSM: {editingLayer.gsm.toFixed(1)} · Type:{' '}
              {LAYER_TYPE_LABELS[editingLayer.materialType] || editingLayer.materialType}
            </p>
            {canConfigureSolvent &&
              editingLayer.materialType === 'adhesive' &&
              editingLayer.isSolventBased && (
                <button
                  type="button"
                  className="btn-secondary w-full min-h-[48px]"
                  onClick={() => onOpenFormulaFromLayerSheet(editingLayer.id)}
                >
                  {laminationRecipeOverrides[editingLayer.id]
                    ? 'Edit formula*'
                    : 'Edit lamination formula'}
                </button>
              )}
          </div>
        )}
      </BottomSheet>

      <BottomSheet open={addLayerSheetOpen} onClose={onCloseAddLayerSheet} title="Add layer">
        <div className="space-y-2">
          {(['substrate', 'ink', 'adhesive'] as const)
            .filter((type) => !structureLocked || type === 'ink')
            .map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => onAddLayerOfType(type)}
                className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-slate text-left font-medium"
              >
                {LAYER_TYPE_LABELS[type] || type}
              </button>
            ))}
        </div>
      </BottomSheet>

      <LaminationFormulaModal
        open={formulaModalLayerId != null}
        title={
          formulaModalLayer
            ? `Lamination formula — ${formulaModalLayer.materialName}`
            : 'Lamination formula'
        }
        recipe={formulaModalRecipe ?? null}
        onClose={onCloseFormulaModal}
        onSave={onSaveFormula}
      />
    </>
  );
}
