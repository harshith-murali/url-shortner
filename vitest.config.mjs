import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals:     true,
    setupFiles:  [],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include:  ['src/**/*.{js,jsx}'],
      exclude:  [
        'src/app/**/*.jsx',  // UI components — covered by integration tests
        'src/components/**',
        '**/__tests__/**',
        '**/node_modules/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
