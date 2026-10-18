import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
const [,, outDir, ...specs] = process.argv; // spec: name@WxH@route@clipHeight
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const s of specs) {
  const [name, size, route, clip, setup] = s.split('@'); const [w, h] = size.split('x').map(Number);
  const c = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 800, hasTouch: w < 800 });
  const p = await c.newPage();
  await p.addInitScript(() => { window.open = () => null; });
  await p.goto('http://localhost:4173/#/' + (route || ''));
  if (setup === 'cart') { await p.evaluate(() => localStorage.setItem('sadan.cart.v1', JSON.stringify([{key:'a',productId:'p-001',slug:'chiffon-classic',name:'x',price:1,color:'موكا',colorHex:'#8A6A55',size:'قياس كبير',quantity:2},{key:'b',productId:'p-008',slug:'underscarf-ribbed',name:'x',price:1,color:'أسود',colorHex:'#1E1E1E',quantity:1}]))); await p.reload(); }
  await p.waitForTimeout(1200);
  await p.screenshot({ path: `${outDir}/${name}.png`, fullPage: !!clip, clip: clip ? { x: 0, y: 0, width: w, height: Math.min(Number(clip), 20000) } : undefined });
  await c.close();
}
await b.close();
