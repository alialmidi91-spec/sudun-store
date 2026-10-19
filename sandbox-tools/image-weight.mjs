// Sandbox-only: يقيس حجم الصور المحمّلة فعلياً لكل صفحة ومقاس، ويقارنها بحجم الأصل لو تحمّل بدل النسخة الأصغر
import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
import { statSync } from 'node:fs';
const PUB = new URL('../public', import.meta.url).pathname;
const VPS = [[360, 780, 3], [412, 915, 3.5], [667, 375, 2], [768, 1024, 2], [1280, 800, 1], [1440, 900, 2], [1920, 1080, 1]];
const PAGES = ['', 'shop', 'product/silk-lebanese-floral', 'about'];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
let totNow = 0, totOrig = 0; const blurry = [];
for (const [w, h, dpr] of VPS) {
  const row = [];
  for (const page of PAGES) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, isMobile: w < 900, hasTouch: w < 900 });
    const p = await ctx.newPage();
    await p.goto('http://localhost:4173/#/' + page); await p.locator('main h1').first().waitFor();
    await p.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 400) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } });
    await p.waitForTimeout(500);
    const imgs = await p.evaluate(() => [...document.querySelectorAll('img')].filter((i) => i.currentSrc && i.complete && /\/images\//.test(i.currentSrc)).map((i) => ({ cur: new URL(i.currentSrc).pathname, src: i.getAttribute('src'), shown: i.getBoundingClientRect().width, nat: i.naturalWidth })));
    const seen = new Set(); let now = 0, orig = 0;
    for (const im of imgs) {
      // عرض الملف الفعلي (naturalWidth يتعدّل حسب srcset فما نعتمد عليه)
      const fileW = +(im.cur.match(/-(\d+)\.webp$/)?.[1] ?? 1189);
      if (im.shown > 0 && fileW < im.shown * dpr * 0.75 && fileW < 1189) blurry.push(`${w}@${dpr}x ${page || 'home'}: ${im.cur} (${fileW}px) لعرض ${Math.round(im.shown)}px×${dpr}`);
      if (seen.has(im.cur)) continue; seen.add(im.cur);
      now += statSync(PUB + im.cur).size; orig += statSync(PUB + im.src).size;
    }
    totNow += now; totOrig += orig;
    row.push(`${page || 'home'} ${Math.round(now / 1024)}KB (بدل ${Math.round(orig / 1024)}KB)`);
    await ctx.close();
  }
  console.log(`${w}x${h}@${dpr}x: ${row.join(' · ')}`);
}
await b.close();
console.log(`\nالمجموع: ${Math.round(totNow / 1024)}KB بدل ${Math.round(totOrig / 1024)}KB — توفير ${Math.round((1 - totNow / totOrig) * 100)}%`);
console.log(blurry.length ? `صور أصغر من اللازم (${blurry.length}):\n  ` + blurry.slice(0, 10).join('\n  ') : 'لا توجد صورة محمّلة بدقة أقل من اللازم');
