import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

const BUILD_VERSION =
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.GITHUB_SHA ||
  String(Date.now());

function emitVersionJsonPlugin(version: string): Plugin {
  return {
    name: 'emit-version-json',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({ version }),
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), emitVersionJsonPlugin(BUILD_VERSION)],
  define: {
    __APP_BUILD_VERSION__: JSON.stringify(BUILD_VERSION),
  },
});
