import netlifyBuild from '@hono/vite-build/netlify-functions'
import { defineConfig } from 'vite'

// Build per Netlify Edge Functions
// Output: .netlify/edge-functions/index.js
// I file statici vengono copiati separatamente dallo script build:netlify
export default defineConfig({
  plugins: [
    netlifyBuild({
      entry: 'src/index.tsx',
      output: 'index.js',
      outputDir: '.netlify/edge-functions'
    })
  ],
  build: {
    emptyOutDir: false,
    copyPublicDir: false
  }
})
