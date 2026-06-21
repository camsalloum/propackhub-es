import { PACKAGING_FAMILY } from '../db/master-materials-io';
import type { MasterMaterial } from '../db/master-materials-io';

/** RM type code for platform-synced materials (MES Phase C). */
export function itemClassForMasterMaterial(m: MasterMaterial): string {
  if (m.type === 'ink') return 'ink';
  if (m.type === 'adhesive') return 'adhesive';
  if (m.type === 'substrate' && m.substrateFamily === PACKAGING_FAMILY) return 'packaging';
  if (m.type === 'substrate') return 'substrate';
  return m.type;
}

/** True when price came from platform sync (excel legacy alias included). */
export function isPlatformPriceSource(source: string | null | undefined): boolean {
  return source === 'platform' || source === 'excel';
}
