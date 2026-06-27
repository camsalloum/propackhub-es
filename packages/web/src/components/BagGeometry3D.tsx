import { useMemo } from 'react';
import * as THREE from 'three';

/** ES bag film colors — match 2D schematic palette */
const BAG_FILL = '#ddeeff';
const SEAL_LIGHT = '#d4d4d8';
const SEAL_DARK = '#a1a1aa';

export interface BagGeometry3DProps {
  width: number;
  height: number;
  gusset: number;
  topFold?: number;
}

function panelMaterialProps() {
  return {
    color: BAG_FILL,
    side: THREE.DoubleSide,
    roughness: 0.6,
    metalness: 0.05,
  } as const;
}

export function BagGeometry3D({ width, height, gusset, topFold = 0 }: BagGeometry3DProps) {
  const frontFace = useMemo(() => {
    const w = width / 100;
    const h = height / 100;
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2, -h / 2);
    shape.lineTo(w / 2, -h / 2);
    shape.lineTo(w / 2, h / 2 - 0.1);
    shape.quadraticCurveTo(w / 2, h / 2, w / 2 - 0.1, h / 2);
    shape.lineTo(-w / 2 + 0.1, h / 2);
    shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - 0.1);
    shape.lineTo(-w / 2, -h / 2);
    return shape;
  }, [width, height]);

  const backFace = useMemo(() => {
    const w = width / 100;
    const h = height / 100;
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2, -h / 2);
    shape.lineTo(w / 2, -h / 2);
    shape.lineTo(w / 2, h / 2 - 0.1);
    shape.quadraticCurveTo(w / 2, h / 2, w / 2 - 0.1, h / 2);
    shape.lineTo(-w / 2 + 0.1, h / 2);
    shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - 0.1);
    shape.lineTo(-w / 2, -h / 2);
    return shape;
  }, [width, height]);

  const gussetShape = useMemo(() => {
    const h = height / 100;
    const g = gusset / 100;
    const shape = new THREE.Shape();
    shape.moveTo(-g / 2, -h / 2);
    shape.lineTo(g / 2, -h / 2);
    shape.lineTo(g / 2, h / 2 - 0.1);
    shape.quadraticCurveTo(g / 2, h / 2, g / 2 - 0.05, h / 2);
    shape.lineTo(-g / 2 + 0.05, h / 2);
    shape.quadraticCurveTo(-g / 2, h / 2, -g / 2, h / 2 - 0.1);
    shape.lineTo(-g / 2, -h / 2);
    return shape;
  }, [height, gusset]);

  const bottomShape = useMemo(() => {
    const w = width / 100;
    const g = gusset / 100;
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2, -g / 2);
    shape.lineTo(w / 2, -g / 2);
    shape.lineTo(w / 2, g / 2);
    shape.lineTo(-w / 2, g / 2);
    shape.lineTo(-w / 2, -g / 2);
    return shape;
  }, [width, gusset]);

  const w = width / 100;
  const h = height / 100;
  const g = gusset / 100;
  const foldH = Math.min(topFold / 100, h * 0.25);
  const panel = panelMaterialProps();

  return (
    <group>
      <mesh position={[0, 0, g / 2 + 0.001]} castShadow receiveShadow>
        <shapeGeometry args={[frontFace]} />
        <meshStandardMaterial {...panel} />
      </mesh>
      <mesh position={[0, 0, -g / 2 - 0.001]} rotation={[0, Math.PI, 0]} castShadow receiveShadow>
        <shapeGeometry args={[backFace]} />
        <meshStandardMaterial {...panel} />
      </mesh>
      <mesh position={[-w / 2 - 0.001, 0, 0]} rotation={[0, -Math.PI / 2, 0]} castShadow receiveShadow>
        <shapeGeometry args={[gussetShape]} />
        <meshStandardMaterial {...panel} />
      </mesh>
      <mesh position={[w / 2 + 0.001, 0, 0]} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow>
        <shapeGeometry args={[gussetShape]} />
        <meshStandardMaterial {...panel} />
      </mesh>
      {gusset > 0 && (
        <mesh position={[0, -h / 2 - 0.001, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
          <shapeGeometry args={[bottomShape]} />
          <meshStandardMaterial {...panel} />
        </mesh>
      )}
      <mesh position={[0, h / 2, 0]} castShadow>
        <boxGeometry args={[w, 0.02, g + 0.02]} />
        <meshStandardMaterial color={SEAL_LIGHT} roughness={0.4} metalness={0.1} />
      </mesh>
      {foldH > 0.005 && (
        <mesh position={[0, h / 2 - foldH / 2, 0]} castShadow>
          <boxGeometry args={[w, foldH, g + 0.015]} />
          <meshStandardMaterial color={SEAL_DARK} roughness={0.3} metalness={0.3} transparent opacity={0.85} />
        </mesh>
      )}
    </group>
  );
}
