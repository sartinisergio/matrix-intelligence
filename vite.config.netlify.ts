import netlifyBuild from '@hono/vite-build/netlify-functions'
import { defineConfig } from 'vite'

// Build per Netlify: Edge Function + file statici nella stessa dir
// Netlify serve i file statici dalla publish dir (dist/)
// e la Edge Function da dist/index.js (con config.preferStatic=true)
export default defineConfig({
  plugins: [
    netlifyBuild({
      entry: 'src/index.tsx',
      output: 'index.js'
    })
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    copyPublicDir: true
  }
})
