// Sandbox-only: full-page screenshots after scrolling (lazy images), split into columns.
import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
const [,, outDir, ...specs] = process.argv; // name@WxH@route
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const errs = [];
for (const s of specs) {
  const [name, size, route] = s.split('@'); const [w, h] = size.split('x').map(Number);
  const c = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 800, hasTouch: w < 800 });
  const p = await c.newPage();
  p.on('pageerror', (e) => errs.push(name + ': ' + e.message));
  p.on('console', (m) => m.type() === 'error' && !m.text().includes('ERR_TUNNEL') && errs.push(name + ': ' + m.text()));
  await p.goto('http://localhost:4173/#/' + (route || ''));
  for (let y = 0; y < 12000; y += 500) { await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(50); }
  await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(700);
  const ov = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  if (ov > 0) errs.push(name + ': horizontal overflow ' + ov + 'px');
  await p.screenshot({ path: `${outDir}/${name}.png`, fullPage: true });
  await c.close();
}
await b.close();
console.log('errors:', errs.length ? errs : 'none');
