import { defineConfig, loadEnv, mergeConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { vtConfig, vtFramework } from './vt-framework';

// The production build goes into the API's wwwroot so one deployment serves both.
// vtFramework/vtConfig integrate the vendored VtWebGuiFramework (vendor/, see vendor/VENDOR.md).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const webPort = Number(env.TIOHUB_WEB_PORT || 5173);
  const apiUrl = env.TIOHUB_API_URL || 'http://localhost:5094';
  return mergeConfig(vtConfig(), {
    plugins: [vtFramework(), react({ include: /\.(jsx|tsx|js)$/ })],
    build: { outDir: '../TioHub.Api/wwwroot', emptyOutDir: true, sourcemap: false, assetsInlineLimit: 0, chunkSizeWarningLimit: 900 },
    server: { port: webPort, strictPort: Boolean(env.TIOHUB_WEB_PORT), proxy: { '/api': apiUrl } },
    test: { environment: 'node', include: ['src/**/*.test.ts'] }
  }) as never;
});
