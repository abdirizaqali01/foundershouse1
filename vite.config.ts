import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  assetsInclude: ['**/*.glsl', '**/*.glb'],
  publicDir: 'public',
  server: {
    // Increase max file size for large GLB files
    hmr: {
      overlay: true,
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Split Three.js core
          if (id.includes('node_modules/three/build')) {
            return 'three-core'
          }
          // Split Three.js examples/addons
          if (id.includes('node_modules/three/examples')) {
            return 'three-addons'
          }
          // Split camera-controls
          if (id.includes('node_modules/camera-controls')) {
            return 'three-addons'
          }
          // Split React libraries
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react-vendor'
          }
          // Split scheduler (React dependency)
          if (id.includes('node_modules/scheduler')) {
            return 'react-vendor'
          }
        },
      },
    },
    // Use esbuild for faster minification
    minify: 'esbuild',
    // Increase chunk size limit to 1000 KB to suppress warning for Three.js
    chunkSizeWarningLimit: 1000,
    // Source map for production debugging (can disable to save more size)
    sourcemap: false,
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Target modern browsers for smaller builds
    target: 'es2020',
  },
})
