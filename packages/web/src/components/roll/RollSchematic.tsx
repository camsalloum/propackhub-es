import type { RollDrawDims } from '../../lib/rollDrawDims';
import { Grid, useDrawAreaSize } from '../continuousWeb/webSvgPrimitives';
import { RollVisualizer } from '../continuousWeb/RollVisualizer';

export function RollSchematic({ dims }: { dims: RollDrawDims }) {
  const { ref, w: vw, h: vh } = useDrawAreaSize(320, 360);
  const outerDiameterMm = dims.rollSpec?.rollOutsideDiameterMm ?? dims.RW * 1.35;
  const coreDiameterMm = dims.rollSpec?.coreOdMm;

  return (
    <div ref={ref} className="w-full h-full min-h-[360px] relative">
      <svg
        className="absolute inset-0 block w-full h-full pointer-events-none"
        viewBox={`0 0 ${vw} ${vh}`}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden
      >
        <Grid w={vw} h={vh} id="roll-3d-grid" />
      </svg>
      <RollVisualizer
        width={vw}
        height={vh}
        className="relative w-full h-full"
        widthMm={dims.RW}
        outerDiameterMm={outerDiameterMm}
        coreDiameterMm={coreDiameterMm}
        cutOffMm={dims.CO > 0 ? dims.CO : undefined}
        wrapCount={dims.rollSpec?.wrapsPerCircumference}
        laneCount={dims.PPC}
        showOuterDiameter={false}
        widthLabel="RW"
      />
    </div>
  );
}
