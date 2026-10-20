import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // The monograph data files (drug_details.json, adverse_event_terms.json)
    // are big but load on demand only on the pages that use them.
    chunkSizeWarningLimit: 3000,
  },
})
