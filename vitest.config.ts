import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['supabase/functions/**/*.ts'],
      exclude: [
        'node_modules/',
        'tests/',
        'dist/',
        'coverage/',
        '*.config.*',
      ],
    },
    testTimeout: 30000,
    hookTimeout: 30000,
  },
})
