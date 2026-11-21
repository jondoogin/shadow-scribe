import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import narratorShelf from './scripts/narrator-shelf.mjs'

export default defineConfig({
  plugins: [react(), tailwindcss(), narratorShelf()],
  server: {
    host: true,   // bind to 0.0.0.0 — accessible on local network (phone, etc.)
    port: 5230,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{js,jsx}'],
    setupFiles: ['src/test/setup.js'],
  },
})
