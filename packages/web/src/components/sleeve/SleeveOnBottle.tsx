import { useMemo } from 'react';
import type { SleeveDrawDims } from '../../lib/sleeveDrawDims';
import { sleeveFormedDiameterMm } from '../../lib/sleeveDrawDims';
import { ContainerOnBottle } from '../shared/ContainerOnBottle';
import { dimLbl } from '../continuousWeb/webSvgPrimitives';

export function SleeveOnBottle({ dims }: { dims: SleeveDrawDims }) {
  const bodyD = sleeveFormedDiameterMm(dims);
  const aria = useMemo(
    () =>
      `Shrink sleeve on bottle, lay-flat ${Math.round(dims.LF)} mm, height ${Math.round(dims.CO)} mm, ${dims.placement}`,
    [dims.LF, dims.CO, dims.placement]
  );

  return (
    <ContainerOnBottle
      bodyDiameterMm={bodyD}
      bandHeightMm={dims.CO}
      bandHeightLabel={dimLbl('CO', dims.CO)}
      widthDimLbl={`Ø≈${Math.round(bodyD)}mm`}
      placement={dims.placement}
      ariaLabel={aria}
      gridId="sleeve-bottle-grid"
    />
  );
}
