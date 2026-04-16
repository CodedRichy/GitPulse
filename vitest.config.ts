import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'src/**/__tests__/**/*.test.ts',
      'action/__tests__/**/*.test.ts',
    ],
    exclude: ['node_modules', 'dist', 'web'],
    coverage: {
      provider: 'v8',
      include: ['src/core/**', 'src/ai/**', 'src/mcp/**', 'action/**'],
      exclude: ['src/**/__tests__/**', 'action/__tests__/**'],
      reporter: ['text', 'lcov'],
    },
    testTimeout: 10000,
  },
});
