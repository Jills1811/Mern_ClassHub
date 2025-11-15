import { defineConfig } from 'vite';
import { transform as esbuildTransform } from 'esbuild';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [
    // Force-transform .js in src as JSX before Vite's import analysis
    {
      name: 'js-as-jsx-pre',
      enforce: 'pre',
      async transform(code, id) {
        if (id.includes('/src/') && id.endsWith('.js')) {
          try {
            const result = await esbuildTransform(code, {
              loader: 'jsx',
              jsx: 'automatic',
              sourcemap: true
            });
            return { code: result.code, map: result.map };
          } catch (e) {
            // fall through; vite will report if needed
            return null;
          }
        }
        return null;
      }
    },
    react()
  ],
  esbuild: {
    // Treat .js files in src/ as JSX to support CRA-style .js with JSX
    loader: 'jsx',
    include: /src\/.*\.(js|jsx)$/,
  },
  optimizeDeps: {
    esbuildOptions: {
      // Also teach the dependency scanner to treat .js as JSX
      loader: {
        '.js': 'jsx'
      }
    }
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'build'
  }
});


