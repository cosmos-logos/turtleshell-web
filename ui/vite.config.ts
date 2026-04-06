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
    port: 5173,
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
