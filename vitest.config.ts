import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: './',
  // Inline (empty) PostCSS config so vite doesn't search parent
  // directories for a postcss.config file — this is not a CSS project
  css: {
    postcss: {},
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['node_modules/', 'dist/', 'tests/'],
    },
  },
});
