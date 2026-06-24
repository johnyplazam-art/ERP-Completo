import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    exclude: ['node_modules/**', 'tests/integration/**'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '../src'),
    },
  },
})
