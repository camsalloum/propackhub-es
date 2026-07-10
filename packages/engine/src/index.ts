// ProPackHub Estimation Studio - Core Engine
// This is the pure costing engine that runs in both browser and server

export * from './types';
export * from './calculator';
export * from './layer-stack';
export * from './template-classification';
export * from './template-scaffolding';
export * from './lamination-recipe';
export * from './solvent-costing';
export * from './packaging-costing';
export * from './sleeve-seaming';
export * from './ink-printing';
export * from './structure-metrics';
export * from './bag-flat-sheet';
export * from './pouch-flat-sheet';
export * from './pouch-accessories';
export * from './unit-conversion';
export * from './waste-bands';
export * from './derive-processes';
export * from './structure-signature';
export * from './roll-after-slitting';
export * from './order-quantity-defaults';

// Re-export for convenience
export { calculateEstimate } from './calculator';