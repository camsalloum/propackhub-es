import { useMemo } from 'react';
import type { RollDrawDims } from '../../lib/rollDrawDims';
import { ContainerOnBottle } from '../shared/ContainerOnBottle';
import { dimLbl } from '../continuousWeb/webSvgPrimitives';

/** Wrap-around label band — RW × CO, centered on body (middle placement). */
export function LabelOnBottle({ dims }: { dims: RollDrawDims }) {
  const bodyD = Math.max(dims.RW * 1.35, 48);
  const aria = useMemo(
    () => `Wrap-around label on bottle, ${Math.round(dims.RW)} by ${Math.round(dims.CO)} mm`,
    [dims.RW, dims.CO]
  );

  return (
    <ContainerOnBottle
      bodyDiameterMm={bodyD}
      bandHeightMm={dims.CO}
      bandHeightLabel={dimLbl('CO', dims.CO)}
      widthDimLbl={dimLbl('RW', dims.RW)}
      placement="middle"
      ariaLabel={aria}
      gridId="label-bottle-grid"
    />
  );
}
