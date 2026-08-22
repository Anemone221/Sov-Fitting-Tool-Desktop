import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

// Renderer + core normally come from the `react` submodule. Set SFT_REACT to an
// application-repo checkout to build against an uncommitted working tree instead —
// unset (as in CI) this resolves exactly as before.
//
// The drive letter is upper-cased because Vite matches the renderer root against
// __dirname textually; a lowercase one resolves but then fails every asset import
// with an unhelpful "../../../../f:/..." rollup error.
const REACT = process.env.SFT_REACT
  ? resolve(process.env.SFT_REACT).replace(/^([a-z]):/, (_m, d: string) => `${d.toUpperCase()}:`)
  : resolve(__dirname, 'react');

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: resolve(__dirname, 'electron/main.ts')
      }
    },
    resolve: {
      alias: {
        '@shared': resolve(REACT, 'src/types'),
        '@core': resolve(REACT, 'core')
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: resolve(__dirname, 'electron/preload.ts')
      }
    },
    resolve: {
      alias: {
        '@shared': resolve(REACT, 'src/types'),
        '@core': resolve(REACT, 'core')
      }
    }
  },
  renderer: {
    root: resolve(REACT, 'src'),
    build: {
      outDir: resolve(__dirname, 'out/renderer'),
      emptyOutDir: true,
      rollupOptions: {
        input: {
          index: resolve(REACT, 'src/index.html')
        }
      }
    },
    resolve: {
      alias: {
        '@': resolve(REACT, 'src'),
        '@shared': resolve(REACT, 'src/types'),
        '@core': resolve(REACT, 'core')
      }
    },
    plugins: [react()]
  }
});
