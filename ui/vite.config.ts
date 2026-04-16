import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import path from 'path';

export default defineConfig({
  plugins: [react(), basicSsl()],
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
      // Proxy API requests to local Ares gateway.
      '/v1': {
        target: 'http://localhost:3451',
        changeOrigin: true,
        secure: false,
      },
      '/api': {
        target: 'http://localhost:3451',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
