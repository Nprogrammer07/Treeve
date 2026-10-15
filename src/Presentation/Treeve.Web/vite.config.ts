import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/ · https://vitest.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // En desarrollo, las llamadas a /api se reenvían a Treeve.Api (dotnet run).
    proxy: {
      '/api': 'http://localhost:5242',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
