type Props = {
  kgHint?: string | null;
  belowMoq?: boolean;
};

export default function PriceListCellHints({ kgHint, belowMoq }: Props) {
  if (!kgHint && !belowMoq) return null;
  return (
    <>
      {kgHint && (
        <span className="block text-[10px] font-normal text-mist font-sans">{kgHint}</span>
      )}
      {belowMoq && (
        <span className="block text-[10px] font-normal text-amber-700 font-sans">Below MOQ</span>
      )}
    </>
  );
}
