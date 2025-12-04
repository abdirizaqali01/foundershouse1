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
})
