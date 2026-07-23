import type { ReactNode } from 'react';
import { BagConfigurator } from '../../../components/BagConfigurator';
import {
  PouchConfigurator,
  type AccessoryMaterialOption,
} from '../../../components/PouchConfigurator';
import { RollConfigurator } from '../../../components/roll/RollConfigurator';
import { SleeveConfigurator } from '../../../components/sleeve/SleeveConfigurator';
import type { PouchAccessorySelection } from '@es/engine';

export type EstimateEditorDimensionsSectionProps = {
  bagConfiguratorActive: boolean;
  pouchConfiguratorActive: boolean;
  rollConfiguratorActive: boolean;
  sleeveConfiguratorActive: boolean;
  productSubtype: string | null;
  dimensions: Record<string, number | undefined>;
  onDimensionsChange: (patch: Record<string, number>) => void;
  accessories: PouchAccessorySelection[];
  onAccessoriesChange: (next: PouchAccessorySelection[]) => void;
  accessoryMaterials: AccessoryMaterialOption[];
  totalGsm: number;
  filmDensityGcm3: number;
  isLabelsRoll: boolean;
  continuousWeb: boolean;
};

/** Bag / Pouch / Roll / Sleeve configurators for Job details dimension panel. */
export function EstimateEditorDimensionsSection({
  bagConfiguratorActive,
  pouchConfiguratorActive,
  rollConfiguratorActive,
  sleeveConfiguratorActive,
  productSubtype,
  dimensions,
  onDimensionsChange,
  accessories,
  onAccessoriesChange,
  accessoryMaterials,
  totalGsm,
  filmDensityGcm3,
  isLabelsRoll,
  continuousWeb,
}: EstimateEditorDimensionsSectionProps): ReactNode {
  if (bagConfiguratorActive) {
    return (
      <BagConfigurator
        productSubtype={productSubtype}
        dimensions={dimensions}
        onDimensionsChange={onDimensionsChange}
      />
    );
  }
  if (pouchConfiguratorActive) {
    return (
      <PouchConfigurator
        productSubtype={productSubtype}
        dimensions={dimensions}
        onDimensionsChange={onDimensionsChange}
        accessories={accessories}
        onAccessoriesChange={onAccessoriesChange}
        accessoryMaterials={accessoryMaterials}
      />
    );
  }
  if (rollConfiguratorActive) {
    return (
      <RollConfigurator
        dimensions={dimensions}
        onDimensionsChange={onDimensionsChange}
        totalGsm={totalGsm}
        filmDensityGcm3={filmDensityGcm3}
        isLabels={isLabelsRoll}
        continuousWeb={continuousWeb}
      />
    );
  }
  if (sleeveConfiguratorActive) {
    return (
      <SleeveConfigurator
        dimensions={dimensions}
        onDimensionsChange={onDimensionsChange}
        totalGsm={totalGsm}
        filmDensityGcm3={filmDensityGcm3}
      />
    );
  }
  return undefined;
}
