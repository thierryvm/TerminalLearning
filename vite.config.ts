import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { sentryVitePlugin } from '@sentry/vite-plugin'

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
    // Upload source maps and create releases on Vercel builds only
    // Uses SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT from env
    ...(process.env.SENTRY_AUTH_TOKEN ? [sentryVitePlugin({ telemetry: false })] : []),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
      // Alias ~ to the project root (for markdown imports)
      '~': path.resolve(__dirname, '.'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],

  build: {
    rollupOptions: {
      output: {
        // Function form automatically captures sub-modules and stays in sync
        // as imports evolve, unlike a static object which can silently drift.
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router')) {
            return 'react-vendor';
          }
          if (id.includes('node_modules/motion')) return 'motion';
          if (id.includes('node_modules/@sentry')) return 'sentry';
          if (id.includes('node_modules/@supabase')) return 'supabase';
          if (id.includes('node_modules/recharts')) return 'charts';
          if (id.includes('node_modules/lucide-react')) return 'icons';
        },
      },
    },
  },
})
