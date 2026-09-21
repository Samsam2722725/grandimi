import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  /* PageSpeed signale « Ancien JavaScript, 25 Kio » : des transformations
     et des polyfills produits pour des navigateurs que personne n'utilise
     ici. La cible es2022 couvre tout ce qui a moins de quatre ans, ce qui
     est large pour un public d'adolescents sur telephone recent. */
  build: {
    target: 'es2022',
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path,
      },
    },
  },
})
