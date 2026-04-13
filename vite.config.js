import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        carosMixer: resolve(__dirname, 'caros-mixer/index.html'),
        carosWidget2: resolve(__dirname, 'caros-widget2/index.html'),
        carosManifest: resolve(__dirname, 'caros-manifest/index.html'),
        dreamNet: resolve(__dirname, 'dream.net/index.html')
      }
    }
  }
});
