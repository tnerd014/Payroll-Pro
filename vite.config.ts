import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './', // Crucial for Electron local file loading
  plugins: [react()],
  server: {
    port: 5174,
    host: true
  },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-xlsx': ['xlsx', 'xlsx-js-style'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-db': ['dexie'],
          'vendor-icons': ['lucide-react'],
        }
      }
    }
  }
});
