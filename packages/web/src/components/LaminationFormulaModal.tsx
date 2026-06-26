import { useEffect, useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import type { LaminationRecipe, LaminationRecipeComponent, LaminationComponentRole } from '@es/engine';

interface LaminationFormulaModalProps {
  open: boolean;
  title: string;
  recipe: LaminationRecipe | null;
  onClose: () => void;
  onSave: (recipe: LaminationRecipe) => void;
  readOnly?: boolean;
}

const ROLES: LaminationComponentRole[] = ['adhesive', 'hardener', 'solvent', 'other'];

function emptyComponent(role: LaminationComponentRole = 'adhesive'): LaminationRecipeComponent {
  return {
    role,
    name: '',
    parts: role === 'solvent' ? 100 : 100,
    solidPercent: role === 'solvent' ? 0 : 75,
    pricePerKgUsd: role === 'solvent' ? undefined : 0,
    solventKey: role === 'solvent' ? 'solvent-ethyl-acetate' : undefined,
  };
}

export default function LaminationFormulaModal({
  open,
  title,
  recipe,
  onClose,
  onSave,
  readOnly = false,
}: LaminationFormulaModalProps) {
  const [draft, setDraft] = useState<LaminationRecipe | null>(recipe);

  useEffect(() => {
    if (open) {
      setDraft(
        recipe
          ? structuredClone(recipe)
          : { tier: 'CUSTOM', components: [emptyComponent('adhesive'), emptyComponent('solvent')] }
      );
    }
  }, [open, recipe]);

  if (!open || !draft) return null;

  const updateComponent = (index: number, patch: Partial<LaminationRecipeComponent>) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const components = prev.components.map((c, i) => (i === index ? { ...c, ...patch } : c));
      return { ...prev, components };
    });
  };

  const addComponent = () => {
    setDraft((prev) =>
      prev ? { ...prev, components: [...prev.components, emptyComponent('other')] } : prev
    );
  };

  const removeComponent = (index: number) => {
    setDraft((prev) => {
      if (!prev || prev.components.length <= 1) return prev;
      return { ...prev, components: prev.components.filter((_, i) => i !== index) };
    });
  };

  const totalParts = draft.components.reduce((s, c) => s + (c.parts || 0), 0);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0 bg-navy/50" aria-label="Close" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h3 className="font-display font-semibold text-navy">{title}</h3>
            <p className="text-xs text-mist mt-1">
              Parts by weight — EA priced at estimate from Solvent catalog. Binder concentrate $/kg solid on layer row.
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-2 text-mist hover:text-navy" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4 space-y-3 flex-1">
          <div className="flex items-center gap-3 text-sm">
            <label className="text-mist">Tier</label>
            <select
              className="input w-32"
              disabled={readOnly}
              value={draft.tier}
              onChange={(e) =>
                setDraft((prev) =>
                  prev ? { ...prev, tier: e.target.value as LaminationRecipe['tier'] } : prev
                )
              }
            >
              {(['GP', 'MP', 'HP', 'HP_SF', 'CUSTOM'] as const).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <span className="text-mist ml-auto">Total parts: {totalParts.toFixed(1)}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-mist border-b border-border">
                  <th className="py-2 pr-2">Role</th>
                  <th className="py-2 pr-2">Component</th>
                  <th className="py-2 pr-2 text-right">Parts</th>
                  <th className="py-2 pr-2 text-right">Solid %</th>
                  <th className="py-2 pr-2 text-right">$/kg</th>
                  {!readOnly && <th className="py-2 w-10" />}
                </tr>
              </thead>
              <tbody>
                {draft.components.map((c, i) => (
                  <tr key={i} className="border-b border-border/60">
                    <td className="py-2 pr-2">
                      <select
                        className="input w-28 text-xs"
                        disabled={readOnly}
                        value={c.role}
                        onChange={(e) =>
                          updateComponent(i, {
                            role: e.target.value as LaminationComponentRole,
                            solidPercent: e.target.value === 'solvent' ? 0 : c.solidPercent || 75,
                          })
                        }
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        className="input w-full text-xs"
                        disabled={readOnly}
                        value={c.name}
                        onChange={(e) => updateComponent(i, { name: e.target.value })}
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        type="number"
                        className="input w-20 text-xs text-right font-mono"
                        disabled={readOnly}
                        min={0}
                        step="0.1"
                        value={c.parts}
                        onChange={(e) => updateComponent(i, { parts: Number(e.target.value) || 0 })}
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        type="number"
                        className="input w-16 text-xs text-right font-mono"
                        disabled={readOnly || c.role === 'solvent'}
                        min={0}
                        max={100}
                        value={c.solidPercent}
                        onChange={(e) => updateComponent(i, { solidPercent: Number(e.target.value) || 0 })}
                      />
                    </td>
                    <td className="py-2 pr-2">
                      {c.role === 'solvent' ? (
                        <span className="text-xs text-mist">from Solvent tab</span>
                      ) : (
                        <input
                          type="number"
                          className="input w-20 text-xs text-right font-mono"
                          disabled={readOnly}
                          min={0}
                          step="0.01"
                          value={c.pricePerKgUsd ?? ''}
                          onChange={(e) =>
                            updateComponent(i, { pricePerKgUsd: Number(e.target.value) || 0 })
                          }
                        />
                      )}
                    </td>
                    {!readOnly && (
                      <td className="py-2">
                        <button
                          type="button"
                          className="text-mist hover:text-danger p-1"
                          onClick={() => removeComponent(i)}
                          aria-label="Remove component"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!readOnly && (
            <button
              type="button"
              className="flex items-center gap-1 text-sm text-blue-700 hover:text-blue-900"
              onClick={addComponent}
            >
              <Plus size={14} /> Add component
            </button>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          {!readOnly && (
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                if (draft) onSave(structuredClone(draft));
                onClose();
              }}
            >
              Save formula
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
