import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The production build goes into the API's wwwroot so one deployment serves both.
export default defineConfig({
  plugins: [react()],
  build: { outDir: '../TioHub.Api/wwwroot', emptyOutDir: true, sourcemap: false, assetsInlineLimit: 0, chunkSizeWarningLimit: 900 },
  server: { port: 5173, proxy: { '/api': 'http://localhost:5094' } },
  test: { environment: 'node', include: ['src/**/*.test.ts'] }
} as never);
