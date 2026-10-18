// Sandbox-only build: bundles the app with esbuild using local shims (no network access here).
import { build } from '/opt/npm-tools/node_modules/esbuild/lib/main.js';
import { mkdirSync, readFileSync, writeFileSync, cpSync, rmSync } from 'node:fs';
const root = new URL('..', import.meta.url).pathname;
const out = root + '.sandbox-build';
const G = '/home/claude/.npm-global/lib/node_modules';
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const alias = {
  'react-router-dom': root + 'sandbox-tools/shims/react-router-dom.tsx',
  'lucide-react': root + 'sandbox-tools/shims/lucide-react.tsx',
  vitest: root + 'sandbox-tools/shims/vitest.ts',
  react: G + '/react', 'react-dom': G + '/react-dom',
};
const single = process.argv.includes('--single');
await build({
  entryPoints: [root + 'src/main.tsx'], bundle: true, format: 'esm', splitting: !single, outdir: out + '/assets',
  jsx: 'automatic', alias, minify: true, target: 'es2019', define: { 'process.env.NODE_ENV': '"production"' },
  loader: { '.svg': 'file' }, logLevel: 'warning',
});
// unit tests
await build({ entryPoints: [root + 'sandbox-tools/run-tests.ts'], bundle: true, platform: 'node', format: 'esm', outfile: out + '/tests.mjs', alias, logLevel: 'warning' });
cpSync(root + 'public', out, { recursive: true });
let html = readFileSync(root + 'index.html', 'utf8')
  .replace('<script type="module" src="/src/main.tsx"></script>', '<link rel="stylesheet" href="assets/main.css" /><script type="module" src="assets/main.js"></script>')
  .replaceAll('href="/favicon.svg"', 'href="favicon.svg"');
writeFileSync(out + '/index.html', html);
console.log('built →', out);
