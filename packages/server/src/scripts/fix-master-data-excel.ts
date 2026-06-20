/**
 * @deprecated Use repair-master-data-excel.py — Node xlsx destroys Excel Tables.
 *
 * Run: npm run repair-master-data-excel
 */
import { execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const script = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../scripts/repair-master-data-excel.py'
);

execSync(`python "${script}"`, { stdio: 'inherit' });
