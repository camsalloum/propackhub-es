import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5000,
    strictPort: true,
    hmr: {
      host: '127.0.0.1',
      port: 5000,
      protocol: 'ws'
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5001',
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