import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5000,
    hmr: {
      host: 'localhost',
      port: 5000,
      protocol: 'ws'
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@es/engine': path.resolve(__dirname, '../engine/src')
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});