/*
Copyright (C) 2025 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

import react from '@vitejs/plugin-react';
import { defineConfig, transformWithEsbuild } from 'vite';
import pkg from '@douyinfe/vite-plugin-semi';
import path from 'path';
import { createRequire } from 'module';
import { codeInspectorPlugin } from 'code-inspector-plugin';
const { vitePluginSemi } = pkg;

const require = createRequire(import.meta.url);
// semi-ui >=2.99 no longer exposes this CSS via its package "exports" map,
// but the file still ships in dist. Resolve the real file path (works under
// both hoisted and isolated node_modules layouts) so Vite's strict exports
// resolution doesn't fail the build.
// Resolve the package main entry, then walk up to the package root, since the
// "exports" map blocks resolving package.json / arbitrary subpaths directly.
const semiUiEntry = require.resolve('@douyinfe/semi-ui');
const semiUiRoot = semiUiEntry.slice(
  0,
  semiUiEntry.indexOf(path.join('@douyinfe', 'semi-ui')) +
    path.join('@douyinfe', 'semi-ui').length,
);
const semiCssPath = path.join(semiUiRoot, 'dist/css/semi.css');

// classic depends on semi-ui, which pulls in an old date-fns-tz that needs the
// date-fns v2 module layout (e.g. ./_lib/cloneObject/index.js). The default
// frontend depends on date-fns v4, which gets hoisted to the workspace root and
// breaks date-fns-tz. Pin date-fns to the v2 copy installed for classic so all
// date-fns imports (including those inside date-fns-tz) resolve consistently.
const dateFnsEntry = require.resolve('date-fns');
const dateFnsRoot = dateFnsEntry.slice(
  0,
  dateFnsEntry.lastIndexOf(`${path.sep}date-fns${path.sep}`) +
    `${path.sep}date-fns`.length,
);

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@douyinfe/semi-ui/dist/css/semi.css': semiCssPath,
      'date-fns': dateFnsRoot,
    },
  },
  plugins: [
    codeInspectorPlugin({
      bundler: 'vite',
    }),
    {
      name: 'treat-js-files-as-jsx',
      async transform(code, id) {
        if (!/src\/.*\.js$/.test(id)) {
          return null;
        }

        // Use the exposed transform from vite, instead of directly
        // transforming with esbuild
        return transformWithEsbuild(code, id, {
          loader: 'jsx',
          jsx: 'automatic',
        });
      },
    },
    react(),
    vitePluginSemi({
      cssLayer: true,
    }),
  ],
  optimizeDeps: {
    force: true,
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
        '.json': 'json',
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-core': ['react', 'react-dom', 'react-router-dom'],
          'semi-ui': ['@douyinfe/semi-icons', '@douyinfe/semi-ui'],
          tools: ['axios', 'history', 'marked'],
          'react-components': [
            'react-dropzone',
            'react-fireworks',
            'react-telegram-login',
            'react-toastify',
            'react-turnstile',
          ],
          i18n: [
            'i18next',
            'react-i18next',
            'i18next-browser-languagedetector',
          ],
        },
      },
    },
  },
  server: {
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/mj': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/pg': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
