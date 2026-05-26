import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,   // bind to 0.0.0.0 — accessible on local network (phone, etc.)
    port: 5230,
  },
})
