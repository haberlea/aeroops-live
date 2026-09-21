import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Test config is kept separate from vite.config.ts so the production `tsc -b`
// build never type-checks the `test` field. Vitest loads this file directly.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
})
