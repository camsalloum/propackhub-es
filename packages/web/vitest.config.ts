import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

// Standalone Vitest config. Mirrors the resolve aliases from vite.config.ts and
// uses @vitejs/plugin-react so component tests transform JSX/TSX identically to
// the app build. The dev-server/proxy config from vite.config.ts is intentionally
// omitted as it is irrelevant to the test runner.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@es/engine': path.resolve(__dirname, '../engine/src')
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    passWithNoTests: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}']
  }
});
