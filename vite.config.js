import { defineConfig } from 'vite';

export default defineConfig({
  // جعل الـ Service Worker يُنسَخ كما هو دون معالجة
  publicDir: false,
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
      }
    }
  },
  server: {
    port: 5173,
    strictPort: false,
    open: true,
  }
});
