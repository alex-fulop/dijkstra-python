// @ts-check
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * @type { import('vite').UserConfig }
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})
