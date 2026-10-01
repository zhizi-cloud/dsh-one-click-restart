/**
 * Build script for dsh-one-click-restart.
 *
 * Two artifacts with two different loading contracts:
 *
 *  - `lib/index.js` — the host half. A plain ESM bundle loaded by the Cordis
 *    loader inside the dsh host process. Node builtins stay external, and no
 *    `@deepseek-ai/*` package is imported at runtime (the host injects the
 *    context), so the shipped file carries no runtime dependency at all.
 *
 *  - `lib/client.js` — the browser half. The shell does not evaluate a client
 *    bundle as a bare ES module; it publishes it through
 *    `window.__ModuleLoader__.load({ id, factory })`, where `factory` receives
 *    the shell's own `require` and returns the module exports. We therefore
 *    bundle to CommonJS with shell-provided modules left external, then wrap
 *    the result in exactly that envelope.
 */
import { build } from 'esbuild'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'))

/**
 * Modules the shell's `require` resolves for a client bundle. Everything else
 * is inlined, so the bundle stays a single self-contained file.
 */
const SHELL_PROVIDED = [
  'react',
  'react-dom',
  'react/jsx-runtime',
  'react-dom/client',
]

/** Indent every non-blank line by `depth` tabs. */
function indent(text, depth) {
  const pad = '\t'.repeat(depth)
  return text
    .split('\n')
    .map(line => (line.trim() === '' ? line : pad + line))
    .join('\n')
}

await mkdir(resolve(root, 'lib'), { recursive: true })

// ---------------------------------------------------------------- host half
await build({
  entryPoints: [resolve(root, 'src/index.ts')],
  outfile: resolve(root, 'lib/index.js'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  external: ['node:*'],
  logLevel: 'warning',
})

// -------------------------------------------------------------- client half
const clientBuild = await build({
  entryPoints: [resolve(root, 'src/client/index.tsx')],
  bundle: true,
  platform: 'browser',
  format: 'cjs',
  target: 'es2022',
  jsx: 'automatic',
  external: [...SHELL_PROVIDED, '@deepseek-ai/*'],
  write: false,
  logLevel: 'warning',
})

const cjs = clientBuild.outputFiles[0].text

const bundle = `window.__ModuleLoader__.load({
\tid: ${JSON.stringify(pkg.name)},
\tfactory: (require) => {
\t\tvar module = { exports: {} };
\t\tvar exports = module.exports;
${indent(cjs, 2)}
\t\treturn module.exports;
\t}
});
`

await writeFile(resolve(root, 'lib/client.js'), bundle, 'utf8')

console.log(`built lib/index.js + lib/client.js for ${pkg.name}@${pkg.version}`)
