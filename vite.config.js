import { defineConfig } from 'vite';
import reactRefresh from '@vitejs/plugin-react-refresh';

export default defineConfig( {
  plugins: [ reactRefresh() ],
  server: {
    hmr: {
      overlay: true, // Ensure that the overlay is enabled for error messages
    },
  },
} );
