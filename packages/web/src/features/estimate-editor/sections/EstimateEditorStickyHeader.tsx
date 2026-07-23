import {
  Save,
  Download,
  ArrowLeft,
  Loader2,
  Check,
  AlertCircle,
  RefreshCw,
  Copy,
  BookmarkPlus,
} from 'lucide-react';
import { estimateStatusLabel } from '../../../lib/estimateStatus';

export type EstimateEditorStickyHeaderEstimate = {
  id?: string;
  refNumber?: string | null;
  status?: string | null;
  structureForked?: boolean;
  processesCustomized?: boolean;
  sourceTemplateKey?: string | null;
} | null | undefined;

export type EstimateEditorStickyHeaderProps = {
  embedded: boolean;
  isDirty: boolean;
  hideEstimateRef: boolean;
  estimate: EstimateEditorStickyHeaderEstimate;
  needsConfiguration: boolean;
  isPriceCheck: boolean;
  multiOnQuote: boolean;
  skuLabel: string;
  jobName: string;
  readOnly: boolean;
  saving: boolean;
  onCancel: () => void;
  onSnapBack: () => void;
  onSaveDraft: () => void;
  onSaveFinal: () => void;
  onDownloadPdf: () => void;
  onSaveAsTemplate: () => void;
  onRequote: () => void;
};

/** Compact estimate header — sticky so Save/Calculate stay reachable while scrolling */
export function EstimateEditorStickyHeader({
  embedded,
  isDirty,
  hideEstimateRef,
  estimate,
  needsConfiguration,
  isPriceCheck,
  multiOnQuote,
  skuLabel,
  jobName,
  readOnly,
  saving,
  onCancel,
  onSnapBack,
  onSaveDraft,
  onSaveFinal,
  onDownloadPdf,
  onSaveAsTemplate,
  onRequote,
}: EstimateEditorStickyHeaderProps) {
  return (
      <div className={`${embedded ? 'relative z-20' : 'sticky top-0 z-30 -mx-4 lg:-mx-8 px-4 lg:px-8'} py-3 mb-6 ${embedded ? '' : 'bg-surface-base/95 backdrop-blur border-b border-border'} flex items-center justify-between gap-3`}>
        {/* Left: Back + title (Back hidden when QuoteWorkspace owns chrome) */}
        <div className="flex items-center gap-3 min-w-0">
          {!embedded && (
            <button
              type="button"
              onClick={onCancel}
              className="btn-secondary inline-flex items-center gap-2 shrink-0"
              title={isDirty ? "Back — unsaved changes" : "Back"}
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </button>
          )}
          <div className="min-w-0">
            <p className="eyebrow font-mono leading-none truncate flex items-center gap-2 flex-wrap">
              <span>
                {hideEstimateRef
                  ? `${estimateStatusLabel(estimate?.status)}${needsConfiguration ? ' · Needs configuration' : ''}`
                  : estimate?.refNumber
                    ? `${estimate.refNumber} · ${estimateStatusLabel(estimate?.status)}${needsConfiguration ? ' · Needs configuration' : ''}`
                    : `Draft estimate${needsConfiguration ? ' · Needs configuration' : ''}`}
              </span>
              {estimate?.structureForked && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs bg-warning/10 text-warning rounded whitespace-nowrap" title="Layers differ from template">
                  <AlertCircle className="w-3 h-3" />
                  Forked
                </span>
              )}
              {estimate?.processesCustomized && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs bg-info/10 text-info rounded whitespace-nowrap" title="Processes manually edited">
                  <Check className="w-3 h-3" />
                  Customized
                </span>
              )}
            </p>
            <h1 className="font-display font-semibold text-brand leading-tight truncate text-lg sm:text-xl">
              {isPriceCheck && multiOnQuote && skuLabel.trim()
                ? skuLabel.trim()
                : jobName}
            </h1>
            {isPriceCheck && multiOnQuote && jobName.trim() && (
              <p className="text-xs text-mist truncate">{jobName.trim()}</p>
            )}
          </div>
        </div>

        {/* Right: actions — single toolbar (no bottom duplicates) */}
        <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
          {!readOnly && estimate?.structureForked && estimate?.sourceTemplateKey && (
            <button
              type="button"
              onClick={onSnapBack}
              disabled={saving}
              className="btn-secondary inline-flex items-center gap-1.5 text-xs"
              title="Revert layers & processes to template defaults"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              <span className="hidden sm:inline">Snap back</span>
            </button>
          )}
          {!readOnly && (
            <button
              type="button"
              onClick={onSaveDraft}
              disabled={saving}
              className="btn-secondary inline-flex items-center gap-1.5"
              title="Save your in-progress work — you can come back to finish it later"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span className="hidden sm:inline">{saving ? 'Saving…' : 'Save draft'}</span>
            </button>
          )}
          {!readOnly && (
            <button
              type="button"
              onClick={onSaveFinal}
              disabled={saving}
              className="btn-primary inline-flex items-center gap-1.5"
              title="Save the completed estimate — validates dimensions, layers, and structure"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span>{saving ? 'Saving…' : 'Save'}</span>
            </button>
          )}
          {!embedded && (
            <button
              type="button"
              onClick={onDownloadPdf}
              disabled={!estimate?.id}
              className="btn-secondary inline-flex items-center gap-1.5"
              title="Download proposal PDF"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">PDF</span>
            </button>
          )}
          {!readOnly && (
            <button
              type="button"
              onClick={onSaveAsTemplate}
              disabled={!estimate?.id}
              className="btn-secondary inline-flex items-center gap-1.5"
              title="Save structure to My Templates"
            >
              <BookmarkPlus className="w-4 h-4" />
              <span className="hidden md:inline">My Templates</span>
            </button>
          )}
          <button
            type="button"
            onClick={onRequote}
            disabled={!estimate?.id}
            className="btn-secondary inline-flex items-center gap-1.5"
            title={readOnly ? 'Create a new quote with fresh prices' : 'Duplicate for re-quote'}
          >
            <Copy className="w-4 h-4" />
            <span className="hidden md:inline">Re-quote</span>
          </button>
        </div>
      </div>
  );
}
