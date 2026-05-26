import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// HTTPS disabled 2026-05-25 — @vitejs/plugin-basic-ssl regenerates a fresh
// self-signed cert on every restart, which Chrome rejects on subresource
// fetches (XHR/fetch/WebSocket) even after click-through. Matches iris
// portal (5174) and olympus-gpt (5183) which also run plain HTTP in dev.
// Re-enable basic-ssl (or wire mkcert) only when an Apple SIWA flow
// needs to be tested locally — SIWA requires HTTPS callback URLs.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    // Fixed port — turtleshell-web owns 5173. iris portal owns 5174,
    // iris turtleshell owns 5175. strictPort: true makes Vite fail loudly
    // if 5173 is busy instead of silently drifting up and clobbering
    // a sibling dev server.
    port: 5173,
    strictPort: true,
    open: true,
    proxy: {
      // Proxy API requests through the athena-303 ngrok tunnel
      // (https://athena-303.templeathena.ai → localhost:3451 Ares).
      // Override with VITE_PROXY_TARGET=http://localhost:3451 to skip the
      // tunnel and hit Ares directly.
      '/v1': {
        target: process.env.VITE_PROXY_TARGET || 'https://athena-303.templeathena.ai',
        changeOrigin: true,
        secure: false,
      },
      '/api': {
        target: process.env.VITE_PROXY_TARGET || 'https://athena-303.templeathena.ai',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
