import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true })).newPage();
await p.addInitScript(() => { window.__opened = []; window.open = (u) => { window.__opened.push(u); return null; }; });
await p.goto('http://localhost:4173/#/product/jersey-everyday'); await p.waitForTimeout(300);
await p.click('.swatch-option[title="كحلي"]'); await p.click('button[aria-label="زيادة الكمية"]'); await p.click('text=اطلبي الآن'); await p.waitForTimeout(300);
await p.fill('#f-name', 'زينب علي'); await p.fill('#f-phone', '+964 770 123 4567'); await p.selectOption('#f-governorate', 'بغداد');
await p.fill('#f-area', 'الكرادة'); await p.fill('#f-address', 'شارع 62، قرب الصيدلية #3 & المطعم'); await p.fill('#f-notes', 'الاتصال قبل الوصول');
await p.click('text=إتمام الطلب عبر واتساب'); await p.waitForTimeout(300);
const url = (await p.evaluate(() => window.__opened))[0];
console.log('URL prefix:', url.slice(0, 40)); console.log('--- decoded message ---\n' + decodeURIComponent(url.split('?text=')[1]));
console.log('--- after-send screen:', await p.locator('.sent-card h2').textContent());
await p.screenshot({ path: process.argv[2] + '/m5-sent.png' });
// contact page form
await p.goto('http://localhost:4173/#/contact'); await p.fill('#c-msg', 'هل يتوفر لون كحلي؟'); await p.click('text=فتح الرسالة في واتساب'); await p.waitForTimeout(200);
console.log('contact URL decoded:', decodeURIComponent((await p.evaluate(() => window.__opened)).at(-1).split('?text=')[1]));
await b.close();
