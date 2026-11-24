import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const pkgDir = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  root: pkgDir,
  build: {
    lib: {
      entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
      formats: ['es'],
      fileName: 'index',
    },
    outDir: fileURLToPath(new URL('./dist', import.meta.url)),
    emptyOutDir: true,
    minify: false,
    sourcemap: true,
  },
})
