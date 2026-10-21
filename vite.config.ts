import { defineConfig } from 'vite';

export default defineConfig({
  publicDir: 'public',
  server: {
    proxy: {
      '/api': 'http://localhost:8787',
      '/media': 'http://localhost:8787'
    }
  },
  build: {
    outDir: 'dist/client',
    emptyOutDir: true
  }
});
