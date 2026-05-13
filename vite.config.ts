import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Loads `.env`, `.env.local`, `.env.[mode]`, `.env.[mode].local` from this directory (project root).
export default defineConfig({
  envDir: '.',
  plugins: [react(), tailwindcss()],
});
