import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],

  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React runtime — stable, cache-friendly
          'react-vendor': ['react', 'react-dom', 'react-router'],
          // Animation library — large, loaded on every page
          'motion': ['motion'],
          // Error monitoring — loaded synchronously but isolated for caching
          'sentry': ['@sentry/react'],
          // Database client
          'supabase': ['@supabase/supabase-js'],
          // Charts — only used in app pages, not landing
          'charts': ['recharts'],
          // Icons — tree-shaken by Vite but isolated for better caching
          'icons': ['lucide-react'],
        },
      },
    },
  },
})
