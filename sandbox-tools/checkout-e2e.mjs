// Sandbox-only: end-to-end checkout scenarios in a phone-sized browser.
import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
const BASE = 'http://localhost:4173/#/';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await b.newContext({ viewport: { width: 384, height: 832 }, isMobile: true, hasTouch: true });
const p = await ctx.newPage();
const errors = []; let pass = 0, fail = 0;
p.on('pageerror', (e) => errors.push(e.message));
await p.addInitScript(() => { window.__opened = []; window.open = (u) => { window.__opened.push(u); return null; }; });
const check = (name, ok, info = '') => { ok ? pass++ : fail++; console.log(ok ? '  ✓' : '  ✗', name, ok ? '' : '→ ' + info); };
const go = async (r) => { await p.goto(BASE + r); await p.waitForTimeout(350); };
const txt = async (sel) => ((await p.locator(sel).first().textContent()) ?? '').trim();
const dd = async (label) => (await p.locator('.summary dl > div', { hasText: label }).locator('dd').first().textContent())?.trim();
const addFromPdp = async (slug, qty = 1) => {
  await go('product/' + slug);
  for (let i = 1; i < qty; i++) await p.click('.pdp__actions ~ * >> nth=0').catch(() => {});
  for (let i = 1; i < qty; i++) await p.locator('button[aria-label="زيادة الكمية"]').first().click();
  await p.click('.pdp__actions .btn--dark'); await p.waitForTimeout(150);
};

console.log('1) سلة فارغة');
await go('cart');
check('رسالة السلة الفارغة', (await txt('.state__title')) === 'سلتچ فارغة حالياً');
check('زر تسوّقي الآن موجود', (await p.locator('.state a[href*="shop"]').count()) === 1);

console.log('2) عرض المنتجات بالسلة');
await addFromPdp('jafsa-shash', 2);
await addFromPdp('georgette-ninja-shawl', 1);
await go('cart');
check('سطرين بالسلة', (await p.locator('.cart-line').count()) === 2, await p.locator('.cart-line').count());
const first = p.locator('.cart-line').first();
check('اسم المنتج', ((await first.locator('h3').textContent()) ?? '').includes('شاش جفسة'));
check('صورة المنتج حقيقية', ((await first.locator('img').getAttribute('src')) ?? '').includes('/images/products/jafsa-olive.webp'));
check('اللون', ((await first.locator('.cart-line__opts').textContent()) ?? '').includes('زيتوني'));
check('سعر القطعة', ((await first.locator('.cart-line__unit').textContent()) ?? '').includes('8,000'));
check('الكمية 2', (await first.locator('.qty__value').textContent()) === '2');
check('مجموع السطر 16,000', ((await first.locator('.cart-line__total').textContent()) ?? '').includes('16,000'));
check('عدد القطع بالعنوان', (await txt('#cart-items-title')).includes('3 قطع'), await txt('#cart-items-title'));
check('مجموع المنتجات 26,000', (await dd('مجموع المنتجات')) === '26,000 د.ع', await dd('مجموع المنتجات'));
check('التوصيل قبل المحافظة', (await dd('أجور التوصيل')) === 'اختاري المحافظة');

console.log('3) زيادة وتقليل وحذف');
await first.locator('button[aria-label="زيادة الكمية"]').click(); await p.waitForTimeout(100);
check('زيادة → 3', (await first.locator('.qty__value').textContent()) === '3');
check('مجموع السطر 24,000', ((await first.locator('.cart-line__total').textContent()) ?? '').includes('24,000'));
await first.locator('button[aria-label="إنقاص الكمية"]').click(); await first.locator('button[aria-label="إنقاص الكمية"]').click(); await p.waitForTimeout(100);
check('تقليل → 1', (await first.locator('.qty__value').textContent()) === '1');
check('زر التقليل معطّل عند 1', await first.locator('button[aria-label="إنقاص الكمية"]').isDisabled());
await p.locator('.cart-line', { hasText: 'جرجيت' }).locator('button', { hasText: 'حذف' }).click(); await p.waitForTimeout(150);
check('الحذف', (await p.locator('.cart-line').count()) === 1);
await p.locator('.cart-line button', { hasText: 'حذف' }).click(); await p.waitForTimeout(150);
check('حذف آخر منتج يُظهر السلة الفارغة', (await txt('.state__title')) === 'سلتچ فارغة حالياً');

console.log('4) الحفظ بين الصفحات وبعد التحديث');
await addFromPdp('cotton-shawl', 2);
await go(''); await go('shop'); await go('about');
check('العدد على شريط التنقل بعد التنقل', (await txt('.mobile-nav__badge')) === '2');
await p.reload(); await p.waitForTimeout(400);
check('العدد بعد التحديث', (await txt('.mobile-nav__badge')) === '2');
await go('cart'); await p.reload(); await p.waitForTimeout(400);
check('السلة بعد تحديث صفحة السلة', (await p.locator('.cart-line').count()) === 1 && (await p.locator('.qty__value').first().textContent()) === '2');
await p.locator('.cart-line button', { hasText: 'حذف' }).click(); await p.waitForTimeout(100);

console.log('5) التوصيل حسب المحافظة');
await addFromPdp('jafsa-shash', 1);
await go('cart');
await p.selectOption('#f-governorate', 'كربلاء'); await p.waitForTimeout(100);
check('كربلاء 3,000', (await dd('أجور التوصيل')) === '3,000 د.ع', await dd('أجور التوصيل'));
check('الإجمالي 11,000', (await dd('المبلغ الإجمالي')) === '11,000 د.ع', await dd('المبلغ الإجمالي'));
await p.selectOption('#f-governorate', 'البصرة'); await p.waitForTimeout(100);
check('البصرة 5,000', (await dd('أجور التوصيل')) === '5,000 د.ع');
check('الإجمالي 13,000', (await dd('المبلغ الإجمالي')) === '13,000 د.ع');
await p.locator('.cart-line button', { hasText: 'حذف' }).click(); await p.waitForTimeout(100);

console.log('6) العروض');
await addFromPdp('ninja-shawl', 2);
await go('cart');
check('تلميح: أضيفي قطعة وحدة', (await txt('.summary__hints')).includes('أضيفي قطعة وحدة من «شال متصل بكب نينجا»'), await txt('.summary__hints'));
await p.locator('.cart-line button[aria-label="زيادة الكمية"]').first().click(); await p.waitForTimeout(100);
check('العرض انطبق', (await p.locator('.summary__offer').count()) === 1);
check('التوصيل مجاني ضمن العرض', (await dd('أجور التوصيل')) === 'مجاني ضمن العرض');
check('الإجمالي 25,000 (بدل 27,000 + توصيل)', (await dd('المبلغ الإجمالي')) === '25,000 د.ع', await dd('المبلغ الإجمالي'));
await addFromPdp('silk-lebanese-floral', 2);
await go('cart');
check('عرضين مطبّقين', (await p.locator('.summary__offer').count()) === 2);
check('التوصيل مجاني مرة وحدة', (await p.locator('.summary dl').innerText()).split('مجاني').length - 1 === 1, await p.locator('.summary dl').innerText());
check('الإجمالي 49,000', (await dd('المبلغ الإجمالي')) === '49,000 د.ع', await dd('المبلغ الإجمالي'));
await addFromPdp('chiffon-rabta-floral', 3);
await go('cart');
check('عرض الشيفون ما ينطبق لأن التوصيل مجاني أصلاً', (await p.locator('.summary__offer', { hasText: 'شيفون' }).count()) === 0);
check('الإجمالي 73,000 (49,000 + 3×8,000)', (await dd('المبلغ الإجمالي')) === '73,000 د.ع', await dd('المبلغ الإجمالي'));

console.log('7) معلومات الزبونة والتحقق');
await p.evaluate(() => localStorage.removeItem('sadan.customer.v1')); await p.reload(); await p.waitForTimeout(400);
await p.click('text=إتمام الطلب عبر واتساب'); await p.waitForTimeout(150);
check('5 رسائل خطأ للحقول الفارغة', (await p.locator('.field__error').count()) === 5, await p.locator('.field__error').count());
check('لا يفتح واتساب قبل إكمال الحقول', (await p.evaluate(() => window.__opened.length)) === 0);
await p.fill('#f-name', 'زينب علي');
await p.fill('#f-phone', '0770');
await p.selectOption('#f-governorate', 'بغداد');
await p.fill('#f-area', 'الكرادة');
await p.fill('#f-address', 'شارع 62 قرب الصيدلية');
await p.fill('#f-notes', 'الاتصال قبل الوصول');
await p.click('text=إتمام الطلب عبر واتساب'); await p.waitForTimeout(150);
check('رقم هاتف خاطئ يُرفض', (await p.locator('.field__error').count()) === 1 && (await txt('.field__error')).includes('رقم هاتف'));
await p.fill('#f-phone', '+964 770 123 4567');
await p.click('text=إتمام الطلب عبر واتساب'); await p.waitForTimeout(300);

console.log('8) رسالة واتساب');
const url = (await p.evaluate(() => window.__opened))[0] ?? '';
check('الرابط على رقم المتجر', url.startsWith('https://wa.me/9647777795064?text='), url.slice(0, 40));
const msg = decodeURIComponent(url.split('?text=')[1] ?? '');
for (const part of ['الاسم: زينب علي', 'رقم الهاتف: 07701234567', 'المحافظة: بغداد', 'المنطقة: الكرادة', 'العنوان بالتفصيل: شارع 62 قرب الصيدلية',
  'شال متصل بكب نينجا', 'ربطة حرير لبناني مشجر', 'ربطة شيفون', 'عدد القطع: 8', 'مجموع المنتجات: 75,000 د.ع',
  '• شال متصل بكب نينجا: 3 قطع بـ 25,000 د.ع = 25,000 د.ع', '• ربطة حرير لبناني مشجر: قطعتين بـ 24,000 د.ع = 24,000 د.ع',
  'أجور التوصيل: مجاني (ضمن العرض)', 'المبلغ الإجمالي النهائي: 73,000 د.ع', 'طريقة الدفع: الدفع عند الاستلام', 'ملاحظات: الاتصال قبل الوصول']) {
  check('الرسالة: ' + part, msg.includes(part));
}
check('شاشة الخطوة الأخيرة', (await txt('.sent-card h2')) === 'فتحنا لچ واتساب برسالة الطلب');
check('زر احتياطي بنفس الرابط', (await p.locator('.sent-card a.btn--dark').getAttribute('href')) === url);
check('السلة ما تفرغ تلقائياً', (await txt('.mobile-nav__badge')) === '8');
await p.click('text=نعم، أرسلت الطلب — فرّغي السلة'); await p.waitForTimeout(200);
check('تفريغ السلة بعد التأكيد', (await txt('.state__title')) === 'سلتچ فارغة حالياً' && (await p.locator('.mobile-nav__badge').count()) === 0);
await addFromPdp('jafsa-shash', 1); await go('cart');
check('معلومات الزبونة محفوظة للطلب القادم', (await p.inputValue('#f-name')) === 'زينب علي' && (await p.inputValue('#f-governorate')) === 'بغداد');
check('الملاحظات ما تنحفظ', (await p.inputValue('#f-notes')) === '');

console.log('\n' + msg);
await b.close();
console.log(`\n${pass} passed, ${fail} failed · page errors: ${errors.length ? errors : 'none'}`);
if (fail || errors.length) process.exit(1);
