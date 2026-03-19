import { defineConfig } from 'vite';
import reactRefresh from '@vitejs/plugin-react-refresh';

export default defineConfig( {
  define: { 'process.env': {} },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'canvas2svg',
      'react-refresh',
    ],
  },
  plugins: [ reactRefresh() ],
  server: {
    hmr: {
      overlay: true, // Ensure that the overlay is enabled for error messages
    },
  },
  build: {
    outDir: 'dist', // Ensure this matches the directory specified in firebase.json
    rollupOptions: {
      output: {
        manualChunks( id ) {
          if( id.includes( '@monaco-editor/react' ) || id.includes( 'monaco-editor' ) ) {
            return 'monaco';
          }

          if( id.includes( 'react' ) || id.includes( 'scheduler' ) ) {
            return 'react-vendor';
          }

          if( id.includes( 'lodash' ) || id.includes( 'file-saver' ) ) {
            return 'app-vendor';
          }

          return null;
        },
      },
    },
  },
} );
