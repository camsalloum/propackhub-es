import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { ContactShadows, Environment, OrbitControls } from '@react-three/drei';
import { BagGeometry3D } from './BagGeometry3D';

export interface BagScene3DProps {
  width: number;
  height: number;
  gusset: number;
  topFold?: number;
}

function Scene({ width, height, gusset, topFold }: BagScene3DProps) {
  return (
    <>
      <ambientLight intensity={0.45} />
      <directionalLight position={[5, 8, 5]} intensity={1.1} castShadow shadow-mapSize={1024} />
      <directionalLight position={[-4, 3, -4]} intensity={0.25} />

      <BagGeometry3D width={width} height={height} gusset={gusset} topFold={topFold} />

      <ContactShadows position={[0, -2.5, 0]} opacity={0.35} scale={12} blur={2.5} far={4} color="#1e293b" />

      <Environment preset="studio" />

      <OrbitControls
        makeDefault
        enablePan={false}
        minDistance={2.5}
        maxDistance={9}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2.1}
      />
    </>
  );
}

/** Lazy-loadable 3D preview — bottom-gusset only; reads mm from parent inputs. */
export function BagScene3D({ width, height, gusset, topFold = 0 }: BagScene3DProps) {
  return (
    <div className="w-full h-full min-h-[360px]">
      <Canvas
        shadows
        camera={{ position: [0, 0.5, 5], fov: 40 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>
          <Scene width={width} height={height} gusset={gusset} topFold={topFold} />
        </Suspense>
      </Canvas>
    </div>
  );
}
