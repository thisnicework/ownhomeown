import { createHash } from 'node:crypto';
import react from '@vitejs/plugin-react';
import JavaScriptObfuscator from 'javascript-obfuscator';
import { defineConfig, type Plugin } from 'vite';

const RAW_VERSION =
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.GITHUB_SHA ||
  String(Date.now());

const BUILD_VERSION = createHash('sha256')
  .update(RAW_VERSION)
  .digest('hex')
  .slice(0, 8);

function emitManifestPlugin(version: string): Plugin {
  return {
    name: 'emit-manifest',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'm.json',
        source: JSON.stringify({ v: version }),
      });
    },
  };
}

function obfuscateAppChunksPlugin(): Plugin {
  return {
    name: 'obfuscate-app-chunks',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      for (const item of Object.values(bundle)) {
        if (item.type !== 'chunk') continue;
        // Skip vendor chunk and Rolldown internal runtime chunks (only obfuscate chunks containing src/ code)
        const hasSrcModule = item.moduleIds.some(
          (id) => id.includes('/src/') && !id.includes('node_modules')
        );
        if (!hasSrcModule || item.name === 'v') continue;

        const isHotCanvasChunk = item.name === 'r';
        const result = JavaScriptObfuscator.obfuscate(item.code, {
          compact: true,
          controlFlowFlattening: !isHotCanvasChunk,
          controlFlowFlatteningThreshold: isHotCanvasChunk ? 0 : 0.5,
          deadCodeInjection: false,
          debugProtection: false,
          disableConsoleOutput: false,
          identifierNamesGenerator: 'hexadecimal',
          log: false,
          numbersToExpressions: true,
          renameGlobals: false,
          selfDefending: false,
          simplify: true,
          splitStrings: true,
          splitStringsChunkLength: 6,
          stringArray: true,
          stringArrayCallsTransform: true,
          stringArrayCallsTransformThreshold: 0.75,
          stringArrayEncoding: ['rc4'],
          stringArrayIndexShift: true,
          stringArrayRotate: true,
          stringArrayShuffle: true,
          stringArrayWrappersCount: 2,
          stringArrayWrappersChainedCalls: true,
          stringArrayWrappersParametersMaxCount: 3,
          stringArrayWrappersType: 'function',
          stringArrayThreshold: 0.9,
          transformObjectKeys: false,
          unicodeEscapeSequence: false,
        });
        item.code = result.getObfuscatedCode();
      }
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    emitManifestPlugin(BUILD_VERSION),
    obfuscateAppChunksPlugin(),
  ],
  define: {
    __APP_BUILD_VERSION__: JSON.stringify(BUILD_VERSION),
  },
  build: {
    sourcemap: false,
    cssCodeSplit: false,
    minify: 'oxc',
    rolldownOptions: {
      output: {
        entryFileNames: 'assets/[hash].js',
        chunkFileNames: 'assets/[hash].js',
        assetFileNames: 'assets/[hash][extname]',
        manualChunks(id) {
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/scheduler/')
          ) {
            return 'v';
          }
          if (
            id.includes('heterotopiaFilters') ||
            id.includes('photoFrameRenderer')
          ) {
            return 'r';
          }
          return undefined;
        },
      },
    },
  },
});
