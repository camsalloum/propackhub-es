import { defineConfig } from 'vitest/config';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const dir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(dir, '.env') });

export default defineConfig({
  resolve: {
    alias: {
      '@es/engine': path.join(dir, '../engine/src/index.ts'),
    },
  },
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.integration.test.ts'],
    testTimeout: 60000,
    hookTimeout: 60000,
  },
});
