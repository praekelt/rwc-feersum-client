import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.js'),
      name: 'RWCFeersumClient',
      fileName: 'rwc-feersum-client',
      formats: ['es', 'umd', 'cjs']
    },
    rollupOptions: {
      external: ['sockjs-client'],
      output: {
        globals: {
          'sockjs-client': 'SockJS'
        }
      }
    },
    sourcemap: true,
    minify: 'terser'
  }
}); 