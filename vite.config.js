import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// base is '/' because the site is served from a custom domain (thrivemap.app)
// rather than a GitHub Pages subdirectory path
export default defineConfig({
  plugins: [react()],
  base: '/',
})
