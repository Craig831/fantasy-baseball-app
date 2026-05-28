import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],

  // Configure build output to 'build/' to match CRA and minimize Docker changes
  build: {
    outDir: 'build',
    emptyOutDir: true,
    sourcemap: true,
  },

  // Path resolution (preserve existing alias)
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  // Development server
  server: {
    port: 3001,
    open: true,
  },

  // Preserve existing Vitest configuration
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    css: true,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/setupTests.ts',
        'src/reportWebVitals.ts',
        'src/index.tsx',
        '**/*.d.ts',
      ],
    },
  },
});
