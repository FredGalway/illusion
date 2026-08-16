import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    open: true,
  },
  optimizeDeps: {
    exclude: ['@dimforge/rapier3d-compat'],
  },
  assetsInclude: ['**/*.ktx2', '**/*.glb', '**/*.gltf'],
})
