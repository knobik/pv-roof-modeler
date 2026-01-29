import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/pv-roof-modeler/',
  build: {
    outDir: 'dist-demo',
  },
})
