// Feature: es-ui-revamp (Phase 1.5) — reusable empty-state surface.
//
// The 2025/2026 best practice for SaaS empty states is: short headline that
// frames the value, one-line explainer, single prominent action, optional
// secondary path. This component encodes that pattern with token-backed
// styling (`.empty-state` family in index.css) so every empty list in the app
// reads the same.

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export interface EmptyStateProps {
  /** Optional icon to feature above the title. */
  icon?: LucideIcon;
  /** Short headline framing the value (≤ 6 words ideal). */
  title: string;
  /** One-line explanation of what will appear here. */
  body?: ReactNode;
  /** Primary call-to-action — pass an existing `<Link>` or `<button>`. */
  action?: ReactNode;
  /** Optional secondary affordance (link, info text). */
  secondary?: ReactNode;
  /** Extra className appended to the wrapper. */
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
  secondary,
  className,
}: EmptyStateProps) {
  const wrapperClass = ['empty-state', className].filter(Boolean).join(' ');
  return (
    <div className={wrapperClass} role="status">
      {Icon && (
        <div className="empty-state-icon" aria-hidden="true">
          <Icon className="w-6 h-6" />
        </div>
      )}
      <h3 className="empty-state-title">{title}</h3>
      {body && <p className="empty-state-body">{body}</p>}
      {action && <div className="mt-1">{action}</div>}
      {secondary && (
        <div className="mt-3 text-xs" style={{ color: 'rgb(var(--color-text-secondary))' }}>
          {secondary}
        </div>
      )}
    </div>
  );
}

export default EmptyState;
