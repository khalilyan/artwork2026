import { defineConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'motion-dom': path.resolve(rootDir, 'node_modules/motion-dom/dist/cjs/index.js'),
      'motion-utils': path.resolve(rootDir, 'node_modules/motion-utils/dist/cjs/index.js'),
    },
  },
});
