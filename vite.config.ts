import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Cross-origin isolation unlocks multi-threaded WebAssembly (faster captions).
// "credentialless" keeps Google Fonts and the Hugging Face model CDN loading.
const isolation = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'credentialless',
};

export default defineConfig({
  plugins: [react()],
  worker: { format: 'es' },
  server: { headers: isolation },
  preview: { headers: isolation },
  build: { chunkSizeWarningLimit: 1500 },
});
