import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Send /api calls to the Express backend (backend/, npm run dev), so the
    // login cookie is same-origin and no CORS setup is needed.
    proxy: { '/api': 'http://localhost:5001' },
  },
  build: {
    // The monograph data files (drug_details.json, adverse_event_terms.json)
    // are big but load on demand only on the pages that use them.
    chunkSizeWarningLimit: 3000,
  },
})
