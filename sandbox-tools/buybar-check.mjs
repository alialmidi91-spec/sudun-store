// Sandbox-only: يتحقق من توقيت ظهور شريط الشراء الثابت بصفحة المنتج
import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; if (!c) console.log('  ✗', m); };
for (const [w, h] of [[360, 780], [390, 844], [412, 915], [568, 320], [667, 375], [844, 390], [932, 430], [768, 1024], [1280, 800]]) {
  const p = await b.newPage({ viewport: { width: w, height: h }, isMobile: w < 1000, hasTouch: w < 1000 });
  await p.goto('http://localhost:4173/#/product/silk-lebanese-floral'); await p.locator('main h1').waitFor();
  const st = () => p.evaluate(() => {
    const bar = document.querySelector('.buybar'); const a = document.querySelector('.pdp__actions').getBoundingClientRect();
    const shown = getComputedStyle(bar).display !== 'none' && bar.classList.contains('is-visible');
    return { shown, actionsVisible: a.top >= 0 && a.bottom <= innerHeight - (shown ? bar.offsetHeight : 0), barTop: bar.getBoundingClientRect().top, footPad: parseFloat(getComputedStyle(document.querySelector('.site-footer__bottom')).paddingBottom), barH: bar.offsetHeight };
  });
  const go = async (fn) => { await p.evaluate(fn); await p.waitForTimeout(400); return st(); };
  const desktop = w >= 900 && h > 500;
  const s0 = await go(() => scrollTo(0, 0));
  ok(desktop ? !s0.shown : s0.shown === !s0.actionsVisible, `${w}x${h} بداية الصفحة: shown=${s0.shown} actionsVisible=${s0.actionsVisible}`);
  const s1 = await go(() => { const a = document.querySelector('.pdp__actions'); scrollTo(0, a.getBoundingClientRect().top + scrollY - innerHeight / 3); });
  ok(!s1.shown && s1.actionsVisible, `${w}x${h} عند الأزرار: shown=${s1.shown}`);
  const s2 = await go(() => scrollTo(0, document.documentElement.scrollHeight));
  ok(desktop ? !s2.shown : s2.shown, `${w}x${h} بعد تجاوز الأزرار: shown=${s2.shown}`);
  if (!desktop) ok(s2.footPad >= s2.barH, `${w}x${h} التذييل ما ينحجب: padding ${s2.footPad} < bar ${s2.barH}`);
  // لوحة المفاتيح: زر الشريط قابل للتركيز فقط وهو ظاهر
  const tab = await p.evaluate(() => [...document.querySelectorAll('.buybar button')].map((x) => x.tabIndex));
  ok(desktop || tab.every((t) => t === 0), `${w}x${h} أزرار الشريط قابلة للتركيز وهو ظاهر`);
  await p.close();
}
await b.close();
console.log(`buybar: ${pass} passed, ${fail} failed`);
