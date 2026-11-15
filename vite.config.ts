import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import lows from './api/lows'

// Serves /api/lows in `vite dev` the same way Vercel does in production.
const api = (): Plugin => ({
  name: 'dev-api',
  configureServer(server) {
    Object.assign(process.env, loadEnv('development', process.cwd(), ''))
    server.middlewares.use('/api/lows', (req, res) => { lows(req, res) })
  },
})

export default defineConfig({
  plugins: [react(), tailwindcss(), api()],
  server: {
    proxy: {
      '/steam': { target: 'https://store.steampowered.com', changeOrigin: true, rewrite: (p) => p.replace(/^\/steam/, '') },
    },
  },
})
