import { useState } from 'react';
import { formatUsdInput, parseUsdInput } from '../lib/currency';

type UsdPriceInputProps = {
  value: number | null | undefined;
  onChange: (value: number) => void;
  disabled?: boolean;
  className?: string;
  title?: string;
};

/** USD price field — shows x.xx; rounds to 2dp on blur. */
export function UsdPriceInput({
  value,
  onChange,
  disabled,
  className,
  title,
}: UsdPriceInputProps) {
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <input
      type="text"
      inputMode="decimal"
      className={className}
      value={draft ?? formatUsdInput(value)}
      disabled={disabled}
      title={title}
      onFocus={(e) => {
        setDraft(formatUsdInput(value));
        e.target.select();
      }}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        const next = parseUsdInput(draft ?? formatUsdInput(value));
        setDraft(null);
        onChange(next);
      }}
    />
  );
}
