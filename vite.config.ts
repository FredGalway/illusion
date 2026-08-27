import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  server: {
    open: true,
  },
  optimizeDeps: {
    exclude: ['@dimforge/rapier3d-compat'],
  },
  assetsInclude: ['**/*.ktx2', '**/*.glb', '**/*.gltf'],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        '02-bnp-motion-card': resolve(__dirname, '02-bnp-motion-card.html'),
        '03-alison-landing-pages': resolve(__dirname, '03-alison-landing-pages.html'),
        '04-alison-app': resolve(__dirname, '04-alison-app.html'),
        '05-alison-publishing': resolve(__dirname, '05-alison-publishing.html'),
        '06-alison-publishing-app': resolve(__dirname, '06-alison-publishing-app.html'),
        '07-credit-agricol-app': resolve(__dirname, '07-credit-agricol-app.html'),
        'horizontal-parallax-v1': resolve(__dirname, 'horizontal-parallax-v1.html'),
      },
    },
  },
})

