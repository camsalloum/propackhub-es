import type { SleeveDrawDims } from '../../lib/sleeveDrawDims';
import { Grid, useDrawAreaSize } from '../continuousWeb/webSvgPrimitives';
import { RollVisualizer } from '../continuousWeb/RollVisualizer';

export function SleeveSchematic({ dims }: { dims: SleeveDrawDims }) {
  const { ref, w: vw, h: vh } = useDrawAreaSize(320, 360);
  const outerDiameterMm = dims.rollSpec?.rollOutsideDiameterMm ?? dims.openWebWidthMm * 1.35;
  const coreDiameterMm = dims.rollSpec?.coreOdMm;

  return (
    <div ref={ref} className="w-full h-full min-h-[360px] relative">
      <svg
        className="absolute inset-0 block w-full h-full pointer-events-none"
        viewBox={`0 0 ${vw} ${vh}`}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden
      >
        <Grid w={vw} h={vh} id="sleeve-3d-grid" />
      </svg>
      <RollVisualizer
        width={vw}
        height={vh}
        className="relative w-full h-full"
        widthMm={dims.openWebWidthMm}
        outerDiameterMm={outerDiameterMm}
        coreDiameterMm={coreDiameterMm}
        cutOffMm={dims.CO}
        wrapCount={dims.rollSpec?.wrapsPerCircumference}
        laneCount={1}
        showOuterDiameter={false}
        widthLabel="OW"
      />
    </div>
  );
}
