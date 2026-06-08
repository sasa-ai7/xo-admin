import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Loads `.env`, `.env.local`, `.env.[mode]`, `.env.[mode].local` from this directory (project root).
export default defineConfig({
  envDir: '.',
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('firebase')) return 'vendor-firebase';
          if (id.includes('react-router')) return 'vendor-router';
          if (id.includes('react-dom') || id.includes('react')) return 'vendor-react';
          if (id.includes('framer-motion')) return 'vendor-motion';
          if (id.includes('recharts')) return 'vendor-charts';
          if (id.includes('@tanstack')) return 'vendor-tanstack';
          if (id.includes('lucide-react')) return 'vendor-icons';
          if (id.includes('xlsx')) return 'vendor-xlsx';
          return 'vendor';
        },
      },
    },
  },
});
