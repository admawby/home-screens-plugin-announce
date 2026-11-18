import { defineConfig } from 'vite';

export default defineConfig({
  esbuild: {
    // Escape non-ASCII so text survives a host that serves the bundle without a charset.
    charset: 'ascii',
    jsx: 'transform',
    jsxFactory: 'React.createElement',
    jsxFragment: 'React.Fragment',
  },
  build: {
    lib: {
      entry: 'src/index.tsx',
      formats: ['iife'],
      name: '__HS_PLUGIN__',
      fileName: () => 'bundle.js',
    },
    sourcemap: true,
    outDir: 'dist',
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        // 'named' ensures the IIFE always produces an object ({ default: ... })
        // rather than assigning a bare value when there is only a default export.
        // The plugin loader reads window.__HS_PLUGIN__['default'].
        exports: 'named',
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
      },
    },
  },
});
