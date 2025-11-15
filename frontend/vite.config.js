import { defineConfig } from 'vite';
import { transform as esbuildTransform } from 'esbuild';
import react from '@vitejs/plugin-react-swc';
import { resolve } from 'path';

export default defineConfig({
  root: 'src',
  plugins: [
    // Force-transform .js in src as JSX before Vite's import analysis
    {
      name: 'js-as-jsx-pre',
      enforce: 'pre',
      async transform(code, id) {
        if (id.endsWith('.js') && !id.includes('node_modules')) {
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
    // Treat .js files as JSX to support CRA-style .js with JSX
    loader: 'jsx',
    include: /.*\.(js|jsx)$/,
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
    outDir: '../build',
    emptyOutDir: true
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
});


