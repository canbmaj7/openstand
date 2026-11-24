// Finishes the type declarations after `tsc`: Node's ESM resolution (moduleResolution
// node16/nodenext) needs explicit file extensions in relative imports, so `./chart` becomes
// `./chart.js` (or `./styles/index.js` for a folder), and dist/index.d.ts points at the entry.

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const dist = resolve(dirname(fileURLToPath(import.meta.url)), '../dist')
const types = join(dist, 'types')

function withExtension(file, spec) {
  if (!spec.startsWith('.') || /\.(js|mjs|cjs|json)$/.test(spec)) return spec
  const base = resolve(dirname(file), spec)
  if (existsSync(`${base}.d.ts`)) return `${spec}.js`
  if (existsSync(join(base, 'index.d.ts'))) return `${spec}/index.js`
  throw new Error(`Cannot resolve ${spec} from ${file}`)
}

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) walk(path)
    else if (name.endsWith('.d.ts')) {
      const text = readFileSync(path, 'utf8')
      const fixed = text
        .replace(/(from\s+['"])([^'"]+)(['"])/g, (_, a, spec, b) => a + withExtension(path, spec) + b)
        .replace(/(import\(\s*['"])([^'"]+)(['"]\s*\))/g, (_, a, spec, b) => a + withExtension(path, spec) + b)
      if (fixed !== text) writeFileSync(path, fixed)
    }
  }
}

walk(types)
writeFileSync(join(dist, 'index.d.ts'), "export * from './types/packages/engine/src/index.js'\n")
