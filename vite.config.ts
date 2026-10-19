import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './', // Crucial for Electron local file loading
  plugins: [react()],
  server: {
    port: 5174,
    host: true
  }
});

