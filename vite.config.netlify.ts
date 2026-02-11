import netlifyBuild from '@hono/vite-build/netlify-functions'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    netlifyBuild({
      entry: 'src/index.tsx',
      output: 'index.js',
      outputDir: 'netlify/edge-functions'
    })
  ],
  build: {
    emptyOutDir: false,
    copyPublicDir: false
  }
})
