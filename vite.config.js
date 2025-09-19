import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Varmista että env variablet näkyvät production buildissa
    'import.meta.env.VITE_IMGBB_API_KEY': JSON.stringify(process.env.VITE_IMGBB_API_KEY),
  }
})
