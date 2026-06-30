import type { ElementType, ReactNode } from 'react';
import { Info } from 'lucide-react';

/**
 * SectionTitle — app-wide pattern for headings that carry instructional /
 * clarification text.
 *
 * RULE (see .kiro/steering/estimation-studio.md → "UI copy"):
 *   Instructional or clarification helper text MUST NOT be rendered inline as
 *   visible body copy. Attach it to the nearest heading via this component so it
 *   surfaces only on hover (native tooltip) behind a small info affordance.
 *   Data labels, counts, and status text are NOT instructional and stay visible.
 *
 * The hint is exposed through the `title` attribute (native hover tooltip) on
 * both the heading and the info icon, and mirrored to `aria-label` so assistive
 * tech can reach it.
 */
export interface SectionTitleProps {
  children: ReactNode;
  /** Instructional/clarification copy shown only on hover. */
  hint?: string;
  /** Heading element to render. Defaults to h3. */
  as?: ElementType;
  /** Classes applied to the heading element (keep existing heading styling). */
  className?: string;
  /** Optional className for the info icon. */
  iconClassName?: string;
}

export function SectionTitle({
  children,
  hint,
  as: Tag = 'h3',
  className = '',
  iconClassName = '',
}: SectionTitleProps) {
  if (!hint) {
    return <Tag className={className}>{children}</Tag>;
  }
  return (
    <Tag
      className={`inline-flex items-center gap-1.5 ${className}`}
      title={hint}
      aria-label={typeof children === 'string' ? `${children}. ${hint}` : hint}
    >
      <span>{children}</span>
      <Info
        className={`w-3.5 h-3.5 text-text-secondary/70 shrink-0 cursor-help ${iconClassName}`}
        aria-hidden="true"
      />
    </Tag>
  );
}

export default SectionTitle;
