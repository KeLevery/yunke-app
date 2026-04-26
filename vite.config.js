import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    host: '0.0.0.0',
    port: 3000
  },
  optimizeDeps: {
    exclude: ['pdfjs-dist']
  },
  build: {
    target: 'esnext',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-vue': ['vue', 'vue-router'],
          'vendor-capacitor': ['@capacitor/core', '@capacitor/app', '@capacitor/local-notifications'],
          'vendor-pdfjs': ['pdfjs-dist']
        }
      }
    }
  }
})
