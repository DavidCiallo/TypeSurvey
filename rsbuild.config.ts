import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';

export default defineConfig({
  html: {
    title: 'QuickForm',
  },
  plugins: [pluginReact()],
  source: {
    entry: {
      index: './client/index.tsx',
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:61206',
        changeOrigin: true,
      },
      '/ws': {
        target: 'http://127.0.0.1:61207',
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
