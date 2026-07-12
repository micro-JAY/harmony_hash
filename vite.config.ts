/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    // prebuild performs a verified, retrying cleanup that is resilient to
    // macOS metadata files being recreated on external volumes.
    emptyOutDir: false,
  },
  test: {
    globals: true,
    environment: 'node',
    // Vitest picks up *.spec.ts by default, which would try to load the
    // Playwright e2e specs and fail on the @playwright/test imports.
    exclude: ['node_modules/**', 'dist/**', 'e2e/**'],
  },
})
