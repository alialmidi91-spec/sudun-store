// Sandbox-only: اختبار لوحة التحكم بالمتصفح ضد خادم Supabase التجريبي، والتأكد أن التعديلات تظهر للزبونة.
// يحتاج: بناء مربوط (.sandbox-build-sb) على المنفذ 4174 + mock-supabase.mjs على 54321 — يشغّلهم run-admin-tests.sh
import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
import { readFileSync } from 'node:fs';

const SITE = 'http://localhost:4174/#/';
const API = 'http://localhost:54321';
const IMG = readFileSync(new URL('../public/images/products/jafsa-olive-400.webp', import.meta.url));
let pass = 0, fail = 0;
const check = (name, ok, info = '') => { ok ? pass++ : fail++; console.log(ok ? '  ✓' : '  ✗', name, ok ? '' : '→ ' + info); };
const api = (p) => fetch(API + p).then((r) => r.json());

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

async function flow(vp) {
  await fetch(API + '/__reset');
  console.log(`\n## ${vp.w}x${vp.h} ${vp.touch ? 'لمس' : 'ماوس'}`);
  const ctx = await b.newContext({ viewport: { width: vp.w, height: vp.h }, isMobile: vp.touch, hasTouch: vp.touch });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('dialog', (d) => d.accept());
  const tap = (loc) => (vp.touch ? loc.tap() : loc.click());
  const h1 = () => p.locator('main h1').first().textContent();

  // 1) بدون دخول
  await p.goto(SITE + 'admin');
  await p.locator('#admin-email').waitFor();
  check('بدون دخول تظهر صفحة الدخول', (await h1())?.includes('تسجيل دخول المدير'));
  check('الصفحة مخفية عن محركات البحث', (await p.locator('meta[name=robots][content*=noindex]').count()) >= 1);
  check('لا هيدر ولا شريط سفلي للمتجر داخل اللوحة', (await p.locator('.site-header, .mobile-nav').count()) === 0);

  // 2) كلمة مرور خاطئة
  await p.fill('#admin-email', 'admin@sudun.test');
  await p.fill('#admin-password', 'wrong');
  await tap(p.locator('.admin-login button[type=submit]'));
  await p.locator('.admin-login .form-error').waitFor();
  check('كلمة مرور خاطئة → رسالة عربية واضحة', (await p.locator('.admin-login .form-error').textContent())?.includes('غير صحيحة'));

  // 3) حساب غير مدير
  await p.fill('#admin-email', 'customer@sudun.test');
  await p.fill('#admin-password', 'Customer-Pass-2026');
  await tap(p.locator('.admin-login button[type=submit]'));
  await p.locator('text=ليس لديك صلاحية').waitFor();
  check('حساب عادي ما يدخل اللوحة', (await p.locator('.admin-list').count()) === 0);
  await tap(p.locator('main button:has-text("تسجيل الخروج")'));
  await p.locator('#admin-email').waitFor();

  // 4) دخول المدير
  await p.fill('#admin-email', 'admin@sudun.test');
  await p.fill('#admin-password', 'Admin-Pass-2026');
  await tap(p.locator('.admin-login button[type=submit]'));
  await p.locator('.admin-item').first().waitFor();
  check('المدير يشوف كل المنتجات (7)', (await p.locator('.admin-item').count()) === 7, await p.locator('.admin-item').count());
  check('كلمة المرور ما انحفظت بالمتصفح', !JSON.stringify(await p.evaluate(() => ({ ...localStorage }))).includes('Admin-Pass-2026'));
  await p.reload();
  await p.locator('.admin-item').first().waitFor();
  check('الجلسة تبقى بعد تحديث الصفحة', (await p.locator('.admin-item').count()) === 7);

  // 5) إضافة منتج كامل
  await tap(p.locator('.admin-page__head a:has-text("إضافة منتج")'));
  await p.locator('form.admin-form').waitFor();
  await tap(p.locator('.admin-savebar button[type=submit]'));
  check('الحفظ الفارغ يُرفض مع أخطاء', (await p.locator('.field.has-error').count()) >= 3, await p.locator('.field.has-error').count());
  check('التركيز ينتقل لأول حقل فيه خطأ', await p.evaluate(() => document.activeElement?.getAttribute('aria-invalid') === 'true'));
  const field = (label) => p.locator('.field', { has: p.locator(`label:text-is("${label}"), label:has-text("${label}")`) }).first().locator('input, select, textarea').first();
  await field('اسم المنتج').fill('شال اختبار ساتان');
  await field('نوع الحجاب').selectOption('shawl');
  await field('الخامة').selectOption('chiffon');
  await field('وصف قصير').fill('وصف قصير للاختبار');
  await field('الوصف الكامل').fill('وصف كامل للاختبار');
  await field('رابط المنتج').fill('test-satin-shawl');
  await field('السعر (د.ع)').fill('١٥٠٠٠'); // أرقام عربية
  await field('السعر قبل الخصم').fill('14000');
  await tap(p.locator('label.check:has-text("عرض كمية") input'));
  await field('عدد القطع').fill('2');
  await field('سعر العرض كاملاً').fill('26000');
  await p.locator('.admin-color__name input').first().fill('كحلي');
  await p.locator('.admin-color__family select').first().selectOption('black');
  await tap(p.locator('button:has-text("إضافة لون")'));
  await p.locator('.admin-color__name input').nth(1).fill('رصاصي');
  await p.locator('.admin-color__avail input').nth(1).uncheck();
  await field('القياسات').fill('150 سم، 180 سم');
  await field('الكمية المتوفرة').fill('5');
  await tap(p.locator('label.check:has-text("منشور") input'));
  // صور: غير مدعومة + كبيرة + صحيحة
  await p.setInputFiles('.admin-upload input', [{ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('x') }, { name: 'huge.jpg', mimeType: 'image/jpeg', buffer: Buffer.alloc(6 * 1024 * 1024, 1) }]);
  check('ملف غير صورة يُرفض قبل الرفع', (await p.locator('.form-error:has-text("notes.txt")').count()) === 1);
  check('صورة أكبر من 5MB تُرفض قبل الرفع', (await p.locator('.form-error:has-text("huge.jpg")').count()) === 1);
  await p.setInputFiles('.admin-upload input', [{ name: 'a.webp', mimeType: 'image/webp', buffer: IMG }, { name: 'b.webp', mimeType: 'image/webp', buffer: IMG }]);
  await p.waitForFunction(() => document.querySelectorAll('.admin-image').length === 2 && !document.querySelector('.admin-upload.is-busy'));
  check('رفع صورتين', (await p.locator('.admin-image').count()) === 2);
  check('الصورة المرفوعة تفتح فعلاً', await p.locator('.admin-image img').first().evaluate((i) => i.complete && i.naturalWidth > 0));
  await tap(p.locator('.admin-image').nth(1).locator('button[aria-label^="تقديم"]'));
  const firstAfterMove = await p.locator('.admin-image img').first().getAttribute('src');
  await tap(p.locator('.admin-image').nth(1).locator('button[aria-label^="إزالة"]'));
  await p.waitForTimeout(300);
  check('إزالة صورة قبل الحفظ تحذفها من التخزين', (await api('/__state')).objects.length === 1, (await api('/__state')).objects.length);
  await tap(p.locator('.admin-savebar button[type=submit]'));
  await p.locator('.field.has-error').first().waitFor();
  check('سعر قبل الخصم أقل من السعر → خطأ', (await p.locator('.field.has-error').textContent())?.includes('أعلى من السعر'));
  await field('السعر قبل الخصم').fill('18000');
  await field('سعر العرض كاملاً').fill('31000'); // أغلى من قطعتين × 15,000
  check('تنبيه: العرض مو أرخص من القطع المنفصلة', (await p.locator('.admin-warnings').textContent())?.includes('مو أرخص'));
  await field('سعر العرض كاملاً').fill('25000');
  check('التنبيه يختفي لما يصير العرض أرخص', (await p.locator('.admin-warnings:has-text("مو أرخص")').count()) === 0);
  await tap(p.locator('.admin-savebar button[type=submit]'));
  await p.locator('.admin-notice').waitFor();
  check('الحفظ يرجع للقائمة مع رسالة', (await p.locator('.admin-notice').textContent())?.includes('ظاهراً للزبائن'));
  const row = (await api('/__state')).products.find((x) => x.slug === 'test-satin-shawl');
  check('محفوظ بقاعدة البيانات بكل الحقول', !!row && row.price === 15000 && row.compare_at_price === 18000 && row.offer?.quantity === 2 && row.offer?.price === 25000 && row.stock_qty === 5 && row.status === 'published' && row.sizes.length === 2 && row.colors.length === 2 && row.colors[1].available === false && row.images.length === 1 && row.images[0] === firstAfterMove, JSON.stringify(row));

  // 6) الزبونة تشوف المنتج الجديد (جلسة منفصلة بدون دخول)
  const c = await (await b.newContext({ viewport: { width: vp.w, height: vp.h }, isMobile: vp.touch, hasTouch: vp.touch })).newPage();
  const cErrors = [];
  c.on('pageerror', (e) => cErrors.push(e.message));
  await c.goto(SITE + 'shop');
  await c.locator('.card').first().waitFor();
  check('الزبونة تشوف 8 منتجات', (await c.locator('.card').count()) === 8, await c.locator('.card').count());
  await c.goto(SITE + 'product/test-satin-shawl');
  await c.locator('main h1').waitFor();
  const pdp = await c.locator('.pdp__info').textContent();
  check('صفحة المنتج: الاسم والسعر والسعر قبل الخصم والعرض', pdp.includes('شال اختبار ساتان') && pdp.includes('15,000') && pdp.includes('18,000') && pdp.includes('25,000'), pdp.slice(0, 200));
  check('الصورة المرفوعة تظهر للزبونة', await c.locator('.pdp__main-image img').evaluate((i) => i.complete && i.naturalWidth > 0));
  check('اللون غير المتوفر معطّل', (await c.locator('.swatch-option input:disabled').count()) === 1);
  // السلة: العرض يُحسب صح مع منتجات قاعدة البيانات
  check('القياسات تظهر للاختيار', (await c.locator('.size-option').count()) === 2);
  await c.locator('.size-option').first().click();
  await c.locator('.pdp__actions .btn--dark').click();
  await c.locator('.pdp__actions .btn--dark').click();
  await c.goto(SITE + 'cart');
  await c.locator('.cart-line').first().waitFor();
  const summary = await c.locator('.summary, .cart__summary, dl').first().textContent();
  check('السلة تطبّق عرض المنتج الجديد (قطعتين بـ 25,000 + توصيل مجاني)', summary.includes('25,000') && /مجاني/.test(summary), summary.replace(/\s+/g, ' ').slice(0, 220));

  // 7) تعديل سعر منتج موجود
  await p.locator('.admin-item:has-text("شال قطن") a:has-text("تعديل")').click();
  await p.locator('form.admin-form').waitFor();
  check('نموذج التعديل محمّل ببيانات المنتج', (await field('السعر (د.ع)').inputValue()) === '13000');
  await field('السعر (د.ع)').fill('12500');
  await tap(p.locator('.admin-savebar button[type=submit]'));
  await p.locator('.admin-notice').waitFor();
  await c.goto(SITE + 'product/cotton-shawl'); await c.reload();
  await c.locator('main h1').waitFor();
  check('السعر الجديد يظهر للزبونة', (await c.locator('.pdp__info .price').textContent()).includes('12,500'));

  // 8) إخفاء ثم نشر
  await tap(p.locator('.admin-item:has-text("شاش جفسة") button:has-text("إخفاء")'));
  await p.locator('.admin-item:has-text("شاش جفسة") .admin-status--hidden').waitFor();
  await c.goto(SITE + 'shop'); await c.reload();
  await c.locator('.card').first().waitFor();
  check('المنتج المخفي يختفي من المتجر', (await c.locator('.card:has-text("شاش جفسة")').count()) === 0);
  await c.goto(SITE + 'product/jafsa-shash'); await c.reload();
  await c.waitForTimeout(800);
  check('رابط المنتج المخفي → غير موجود', ((await c.locator('main').textContent()) ?? '').includes('غير موجود'));
  await tap(p.locator('.admin-item:has-text("شاش جفسة") button:has-text("نشر")'));
  await p.locator('.admin-item:has-text("شاش جفسة") .admin-status--published').waitFor();
  check('النشر يرجعه', (await api('/__state')).products.find((x) => x.slug === 'jafsa-shash').status === 'published');

  // 9) الحذف بعد التأكيد
  await tap(p.locator('.admin-item:has-text("شال اختبار ساتان") button:has-text("حذف")'));
  await p.locator('[role=alertdialog]').waitFor();
  check('نافذة التأكيد: التركيز على «إلغاء»', await p.evaluate(() => document.activeElement?.textContent?.trim() === 'إلغاء'));
  await p.keyboard.press('Escape');
  await p.waitForTimeout(200);
  check('Escape يلغي بدون حذف', (await p.locator('[role=alertdialog]').count()) === 0 && (await api('/__state')).products.some((x) => x.slug === 'test-satin-shawl'));
  await tap(p.locator('.admin-item:has-text("شال اختبار ساتان") button:has-text("حذف")'));
  await tap(p.locator('[role=alertdialog] button:has-text("نعم")'));
  await p.locator('.admin-notice:has-text("تم حذف")').waitFor();
  const st = await api('/__state');
  check('الحذف من قاعدة البيانات', !st.products.some((x) => x.slug === 'test-satin-shawl'));
  check('صور المنتج المحذوف انحذفت من التخزين', st.objects.length === 0, st.objects);
  check('المنتجات الأصلية بقت 7', st.products.length === 7);

  // 10) خروج
  await tap(p.locator('.admin-bar button:has-text("خروج"), .admin-bar button[title]').first());
  await p.locator('#admin-email').waitFor();
  check('الخروج يمسح الجلسة', !(await p.evaluate(() => localStorage.getItem('sudun.admin.session.v1'))));
  check('لا أخطاء JavaScript (اللوحة)', errors.length === 0, errors.join(' | '));
  check('لا أخطاء JavaScript (المتجر)', cErrors.length === 0, cErrors.join(' | '));
  await ctx.close();
  await c.context().close();
}

await flow({ w: 390, h: 844, touch: true });
await flow({ w: 1280, h: 800, touch: false });

// 11) انتهاء الرمز: يتجدد تلقائياً بدون ما تطلع المديرة
{
  await fetch(API + '/__reset');
  console.log('\n## تجديد الجلسة');
  const ctx = await b.newContext({ viewport: { width: 1024, height: 768 } });
  const p = await ctx.newPage();
  await p.goto(SITE + 'admin');
  await p.fill('#admin-email', 'admin@sudun.test');
  await p.fill('#admin-password', 'Admin-Pass-2026');
  await p.click('.admin-login button[type=submit]');
  await p.locator('.admin-item').first().waitFor();
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('sudun.admin.session.v1')); s.expires_at = 1; localStorage.setItem('sudun.admin.session.v1', JSON.stringify(s)); });
  await p.reload();
  await p.locator('.admin-item').first().waitFor({ timeout: 8000 });
  check('رمز منتهي يتجدد تلقائياً', (await api('/__state')).log.some((l) => l.startsWith('POST /auth/v1/token?grant_type=refresh_token')));
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('sudun.admin.session.v1')); s.expires_at = 1; s.refresh_token = 'bad'; localStorage.setItem('sudun.admin.session.v1', JSON.stringify(s)); });
  await p.reload();
  await p.locator('#admin-email').waitFor({ timeout: 8000 });
  check('جلسة غير صالحة → يرجع لصفحة الدخول', true);
  await ctx.close();
}

// 12) التجاوب: بدون تمرير أفقي وأهداف لمس مناسبة على كل المقاسات
{
  await fetch(API + '/__reset');
  console.log('\n## التجاوب');
  for (const [w, h] of [[320, 640], [360, 780], [390, 844], [430, 932], [568, 320], [768, 1024], [1024, 768], [1280, 800], [1440, 900], [1920, 1080]]) {
    const touch = w < 1100;
    const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: touch, hasTouch: touch });
    const p = await ctx.newPage();
    const issues = [];
    const audit = async (label) => {
      const r = await p.evaluate((cfgW) => {
        const over = document.documentElement.scrollWidth - cfgW;
        const small = [...document.querySelectorAll('.admin button, .admin a, .admin input:not([type=file]), .admin select')]
          .filter((e) => { const b = e.getBoundingClientRect(); const cs = getComputedStyle(e); return b.width > 0 && cs.visibility !== 'hidden' && !e.closest('.visually-hidden') && (b.height < 40 || b.width < 24) && !['checkbox', 'radio'].includes(e.type); })
          .map((e) => `${e.tagName.toLowerCase()} «${(e.getAttribute('aria-label') || e.textContent || e.value || '').trim().slice(0, 20)}» ${Math.round(e.getBoundingClientRect().height)}px`);
        const tiny = [...document.querySelectorAll('.admin *')].filter((e) => e.childNodes.length && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(e).fontSize) < 11.5).length;
        return { over, small: small.slice(0, 4), tiny };
      }, w);
      if (r.over > 0) issues.push(`${label}: تمرير أفقي ${r.over}px`);
      if (r.small.length) issues.push(`${label}: أهداف لمس صغيرة ${r.small.join(', ')}`);
      if (r.tiny) issues.push(`${label}: ${r.tiny} نص أصغر من 11.5px`);
    };
    await p.goto(SITE + 'admin'); await p.locator('#admin-email').waitFor(); await audit('الدخول');
    await p.fill('#admin-email', 'admin@sudun.test'); await p.fill('#admin-password', 'Admin-Pass-2026');
    await p.click('.admin-login button[type=submit]'); await p.locator('.admin-item').first().waitFor(); await audit('القائمة');
    await p.goto(SITE + 'admin/products/sd-001'); await p.locator('form.admin-form').waitFor(); await audit('التعديل');
    await p.goto(SITE + 'admin/products/new'); await p.locator('form.admin-form').waitFor(); await audit('جديد');
    await p.goto(SITE + 'admin'); await p.locator('.admin-item').first().waitFor();
    await p.locator('.admin-item').first().locator('button:has-text("حذف")').click(); await p.locator('[role=alertdialog]').waitFor(); await audit('التأكيد');
    check(`${w}x${h}`, issues.length === 0, issues.join(' | '));
    await ctx.close();
  }
}

await b.close();
console.log(`\nadmin: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
