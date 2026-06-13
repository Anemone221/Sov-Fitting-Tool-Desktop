import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

const REACT = resolve(__dirname, 'react');

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
