// Sandbox-only: builds a single self-contained HTML preview (in-memory routing) for an Artifact.
import { build } from '/opt/npm-tools/node_modules/esbuild/lib/main.js';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const root = new URL('..', import.meta.url).pathname;
const G = '/home/claude/.npm-global/lib/node_modules';
const out = process.argv[2];
const r = await build({
  entryPoints: [root + 'src/main.tsx'], bundle: true, format: 'iife', write: false, outdir: '/tmp/pv',
  jsx: 'automatic', minify: true, target: 'es2019', logLevel: 'warning',
  define: { 'process.env.NODE_ENV': '"production"', __MEMORY_ROUTER__: 'true' },
  alias: { 'react-router-dom': root + 'sandbox-tools/shims/react-router-dom.tsx', 'lucide-react': root + 'sandbox-tools/shims/lucide-react.tsx', react: G + '/react', 'react-dom': G + '/react-dom' },
});
const js = r.outputFiles.find((f) => f.path.endsWith('.js')).text.replace(/<\/script/gi, '<\\/script')
  // preview only: asset paths relative to the artifact
  .replaceAll('"/images/', '"images/').replaceAll('`/brand/', '`brand/').replaceAll('"/brand/', '"brand/');
const css = r.outputFiles.find((f) => f.path.endsWith('.css')).text;
const html = `<title>متجر سُدَن</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Cormorant+Garamond:wght@400;500;600&family=IBM+Plex+Sans+Arabic:wght@300;400;500;600&display=swap">
<style>${css}
/* preview-only: keep sticky header clear of phone status bar; site is a single light look */
:root{color-scheme:light}
html,body{background:#F8F5EF}
.site-header{top:env(safe-area-inset-top,0px)}
</style>
<script>document.documentElement.lang='ar';document.documentElement.dir='rtl';</script>
<div id="root"></div>
<script>${js}</script>`;
mkdirSync(out.replace(/\/[^/]+$/, ''), { recursive: true });
writeFileSync(out, html);
console.log('preview', (html.length / 1024).toFixed(0) + 'KB →', out);
