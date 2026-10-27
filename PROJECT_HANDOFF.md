# PROJECT_HANDOFF — متجر سُدَن | SUDUN

> ملف تسليم لمتابعة العمل من مساعد ذكاء اصطناعي آخر أو مطوّر جديد.
> كُتب بتاريخ 2026-10-27 اعتماداً على المحادثة الفعلية وملفات المستودع فقط.
> **لا يحتوي أي كلمة مرور أو مفتاح سري.** أي معلومة غير مؤكدة مذكورة صراحةً على أنها غير مؤكدة.

---

## 0) ملخص سريع (اقرأ هذا أولاً)

| البند | القيمة |
|---|---|
| المستودع | https://github.com/alialmidi91-spec/sudun-store (عام) |
| الموقع المنشور | https://ornate-dodol-f0944a.netlify.app/ (Netlify، يُبنى من فرع `main`) |
| فرع الإنتاج `main` | commit `d5faf27` — المتجر كامل بدون لوحة تحكم |
| فرع العمل `admin-phase-1` | commit `deed582` (+ هذا الملف) — لوحة التحكم المرحلة الأولى + ربط Supabase |
| Pull Request | **#1** موجود على GitHub (من `admin-phase-1` إلى `main`) — **غير مدموج**. حالة معاينة Netlify له **غير معروفة** (لم أستطع فتحها من بيئتي) |
| Supabase | **لم يُنشأ أي مشروع بعد** — اللوحة غير مفعّلة فعلياً |
| آخر خطوة منتظرة | المالكة تجهّز Supabase حسب `docs/ADMIN_SETUP.md`، ثم نراجع معاينة PR #1 قبل الدمج |

---

## 1) فكرة المشروع

- **ما هو:** واجهة متجر إلكتروني عربية (RTL) حقيقية لبراند الحجابات العراقي **سُدَن | SUDUN** (حساب إنستغرام `@sudun_hijab`). الاسم الأصلي بالمواصفات كان «SADAN | سدن» ثم اعتُمد الاسم كما في إنستغرام: «سُدَن / SUDUN».
- **الهدف:** عرض المنتجات بشكل احترافي واستقبال الطلبات **عبر واتساب** برسالة جاهزة، والدفع **كاش عند الاستلام** فقط. لا توجد بوابة دفع ولا يُسجَّل الطلب بقاعدة بيانات (الطلب يصل فقط عندما ترسل الزبونة رسالة واتساب).
- **الفئة المستهدفة:** نساء في العراق، أغلب الاستخدام من الموبايل (المالكة تستخدم Samsung S24 Ultra وتريد دعم Chrome وSamsung Internet). اللهجة عراقية بالنصوص، العملة دينار عراقي (IQD).
- **الوظائف الأساسية:** تصفح المنتجات، بحث، تصفية وترتيب، صفحة منتج بالألوان والقياسات، سلة محفوظة بالمتصفح، حساب العروض والتوصيل تلقائياً، نموذج طلب ثم فتح واتساب، صفحات معلومات وسياسات. وفي فرع `admin-phase-1`: لوحة تحكم لإدارة المنتجات.

### بيانات المتجر الحقيقية (مؤكدة من المالكة — لا تغيّرها)
- واتساب الطلبات: `+964 777 779 5064` → بالصيغة الدولية `9647777795064`.
- إنستغرام: https://www.instagram.com/sudun_hijab (مخصص للطلبات أيضاً).
- التوصيل: **كربلاء 3,000 د.ع**، **باقي المحافظات 5,000 د.ع**، المدة **24 ساعة**.
- الدفع: عند الاستلام فقط. كل المنتجات متوفرة حالياً. العروض فعّالة.
- سياسة الاستبدال/الإرجاع: **لم تُحدَّد** (تظهر «يُحدَّد من المتجر»).
- القياسات والألوان الإضافية وصور منتجات أخرى: **ستُرسل لاحقاً** من المالكة (غير متوفرة بعد).
- كل خامة فلتر مستقل. المنتجان 3 و4 منتجان مختلفان.

---

## 2) ما تم إنجازه فعلياً (بالترتيب الزمني)

> كل ما يلي **منفّذ ومختبر** في بيئة المحادثة إلا إذا ذُكر غير ذلك.

1. **البناء الأولي:** React + TypeScript + Vite + React Router + lucide-react + CSS منظّم، سلة بـ localStorage، طلب واتساب، صفحات (الرئيسية، المتجر، المنتج، السلة، من نحن، تواصل، التوصيل، الاستبدال، الأسئلة، 404).
2. **البيانات الحقيقية:** 7 منتجات حقيقية من منشورات إنستغرام مع صورها الأصلية (بدون تعديل ألوان أو نقوش)، الشعار الأصلي (wordmark فاتح/داكن، نجمة، شعار كامل) مستخرج من ملفات المالكة.
3. **تطوير التصميم:** هوية بصرية (ألوان العاجي/البني/الذهبي، خطوط Amiri وIBM Plex Sans Arabic وCormorant Garamond)، Hero داكن، دوائر الأقسام، شريط «أحدث القطع» الأفقي، قسم العروض، قصة البراند، «شلون تطلبين؟»، شبكة إنستغرام، الأسئلة الشائعة.
4. **إتمام الطلب:** محسّن «أفضل سعر» `priceOrder` يختار أرخص تركيبة عروض للزبونة، التوصيل المجاني يُحسب مرة واحدة، تقدير التوصيل قبل اختيار المحافظة، تحقق من رقم الهاتف العراقي، رسالة واتساب مفصلة، شاشة تأكيد بعد الإرسال، صيغ جمع عربية («قطعة وحدة/قطعتين/3 قطع»). اكتُشف وأُصلح خطأ عرض الشيفون (3×8000=24000 أرخص من عرض 25000 عندما يكون التوصيل مجانياً أصلاً).
5. **التجاوب:** فحص 14 عرض شاشة × 22 صفحة (من 3,898 ملاحظة إلى صفر)، Safe Areas للنوتش، تكبير النص 150%/200%، تخطيط التابلت.
6. **تجهيز النشر على Netlify** (`netlify.toml`, `public/_redirects`, `vercel.json`). المالكة نشرت الموقع على Netlify بنفسها (الرابط أعلاه).
7. **خطة الإصلاح ذات المراحل الخمس (commits `62a6f59` → `d5faf27`):**
   - المرحلة 1: الوضع الأفقي والأشرطة الثابتة (هيدر مضغوط بالشاشات القصيرة، إخفاء الشريط السفلي أفقياً، ثبات سطر «تصفية/ترتيب» فقط) — تغطية الأشرطة الثابتة نزلت من 80% إلى ≤25%.
   - المرحلة 2: صفحة المنتج — شريط الشراء الثابت يظهر ما دامت أزرار الشراء خارج الشاشة، نسبة صورة 15:16 قريبة من الصور الأصلية، عمودين بالوضع الأفقي.
   - المرحلة 3: صور متجاوبة `srcset/sizes` بنسخ 400/640/900px (الأصل بدون تعديل) — توفير ~57% من حجم الصور.
   - المرحلة 4: مجموعات تصفية قابلة للطي (accessible، تفتح تلقائياً إذا بيها اختيار).
   - المرحلة 5: شعار بدقة مضاعفة، إصلاح تداخل «التفاصيل» مع عنوان البطاقة، أسماء الألوان بسطر واحد، هدف لمس الشعار 44px.
8. **رفع المشروع إلى GitHub:** بعد ربط حساب GitHub بـ Claude Code وتثبيت Claude GitHub App، رُفع `main` عند `d5faf27` وتم التحقق من الملفات على GitHub.
9. **لوحة التحكم — المرحلة الأولى (commit `deed582` على فرع `admin-phase-1`):** تفاصيلها في الأقسام 6 و7 و8.

### ما هو مقترح فقط (غير منفّذ)
- إدارة الطلبات من اللوحة، إنقاص المخزون تلقائياً، إضافة أنواع/خامات من اللوحة، نسخ مصغّرة للصور المرفوعة عبر اللوحة، سجل تعديلات، نسخ احتياطي، ربط دومين خاص، تحديث `siteUrl`.

---

## 3) الحالة الحالية

### يعمل الآن (على الموقع المنشور من `main`)
- المتجر كامل من الملف الثابت `src/data/products.ts`: التصفح، البحث، التصفية، صفحة المنتج، السلة، العروض، التوصيل، طلب واتساب.
- **ملاحظة:** الموقع المنشور تم فتحه وعنوانه صحيح («سُدَن | SUDUN — براند عراقي للحجابات»)، لكن لم أستطع تشغيل JavaScript فيه من بيئتي؛ أي أن نجاح البناء على Netlify مستنتج من وجود الموقع، وليس من سجل بناء رأيته.

### جاهز بالكود لكنه غير مفعّل (فرع `admin-phase-1`)
- لوحة التحكم `/admin` + قراءة المتجر من Supabase. **تحتاج** إنشاء مشروع Supabase + متغيرات بيئة في Netlify + دمج PR #1. بدون المتغيرات تعرض اللوحة رسالة «قاعدة البيانات غير مربوطة بعد» ويبقى المتجر كما هو.

### لم يُتحقق منه بعد
- **البناء الحقيقي بـ Vite** و**فحص TypeScript الكامل** (`tsc -b`) لفرع `admin-phase-1`: لم يُشغَّلا لأن npm محجوب في بيئة المحادثة. أُجري فحص TypeScript **جزئي** بتعريفات بديلة (0 أخطاء بعد إصلاح خطأ قديم). التحقق الفعلي سيكون من معاينة Netlify لـ PR #1 (مضبوطة لتشغيل `npm run build:check`).
- الاتصال بـ Supabase حقيقي (لم يُنشأ مشروع).
- متصفحات Firefox/Safari/Samsung Internet (الفحص كان على Chromium فقط بمحاكاة المقاسات).

### غير مكتمل / ينتظر المالكة
- سياسة الاستبدال، القياسات، الألوان الإضافية، صور ومنتجات جديدة، الدومين و`siteUrl` (حالياً `https://example.com`).

---

## 4) التقنيات المستخدمة

- **اللغة:** TypeScript (strict) + TSX، CSS عادي.
- **الأطر والمكتبات** (`package.json`): `react@^18.3.1`, `react-dom@^18.3.1`, `react-router-dom@^6.28.0`, `lucide-react@^0.460.0`. أدوات التطوير: `vite@^5.4.11`, `@vitejs/plugin-react`, `typescript@^5.6.3`, `vitest@^2.1.8`, `@types/react*`.
- **لا توجد مكتبة Supabase**: العميل مكتوب يدوياً فوق `fetch` (`src/lib/supabase-rest.ts`) لأن npm كان محجوباً، ولتقليل الاعتماديات.
- **الخدمات الخارجية:**
  - Netlify (استضافة مجانية، يبني `npm run build` وينشر `dist`).
  - GitHub (المستودع).
  - Supabase (مخطط له: Postgres + Auth + Storage على الخطة المجانية — غير مُنشأ بعد).
  - WhatsApp (روابط `wa.me` فقط)، Google Fonts.
- **Node:** 20 على Netlify (`NODE_VERSION = "20"`)، README يقول 18 أو أحدث.
- **سكربت Python اختياري:** `scripts/make-image-variants.py` (يحتاج Pillow).

---

## 5) هيكل المشروع والملفات المهمة

```
.
├── PROJECT_HANDOFF.md        ← هذا الملف
├── README.md                 ← تشغيل، نشر، صور، اختبارات، نقاط التوقف
├── docs/ADMIN_SETUP.md       ← خطوات إعداد Supabase + Netlify للوحة التحكم (فرع admin-phase-1)
├── .env.example              ← أسماء متغيرات Supabase فقط (فارغة)
├── netlify.toml              ← build/publish، SPA redirect، كاش /assets، هيدرز /admin، build:check للمعاينات
├── vercel.json, public/_redirects ← بدائل لروابط SPA
├── index.html, vite.config.ts, tsconfig.json, package.json
├── public/
│   ├── brand/                ← الشعار الأصلي (wordmark-dark/light + -2x، logo، star)
│   ├── images/products/      ← 7 صور منتجات أصلية + نسخ -400/-640/-900
│   ├── images/brand/         ← 3 صور براند + نسخها
│   ├── robots.txt            ← Disallow: /admin
│   └── favicon.png, apple-touch-icon.png, og-image.jpg
├── scripts/make-image-variants.py ← يولّد النسخ المصغّرة ويحدّث src/data/image-variants.ts
├── supabase/
│   ├── migrations/001_products_admin.sql ← الجداول + RLS + حاوية الصور
│   └── seed_products.sql     ← المنتجات السبعة الحقيقية (مولَّد تلقائياً)
├── sandbox-tools/            ← أدوات اختبار خاصة ببيئة المحادثة (انظر القسم 6)
└── src/
    ├── main.tsx, App.tsx     ← نقطة البدء والمسارات (الصفحات lazy)
    ├── types.ts              ← Product, ProductColor, ProductOffer, CartLine, CustomerInfo
    ├── vite-env.d.ts         ← أنواع VITE_SUPABASE_*
    ├── config/site.ts        ← ⚠️ الاسم، واتساب، إنستغرام، التوصيل، الإعلان — لا تغيّر القيم
    ├── config/supabase.ts    ← قراءة متغيرات Supabase + رفض المفاتيح السرية
    ├── data/products.ts      ← ⚠️ المنتجات السبعة الحقيقية (مصدر البذرة) — لا تغيّرها
    ├── data/taxonomy.ts      ← الأنواع، الخامات، عائلات الألوان، نطاقات الأسعار، المحافظات
    ├── data/faqs.ts, data/image-variants.ts (مولَّد)
    ├── lib/cart-math.ts      ← ⚠️ clampQty, lineTotal, priceOrder (أفضل سعر للعروض)
    ├── lib/whatsapp.ts       ← ⚠️ buildOrderMessage, buildWhatsappUrl, storeChatUrl
    ├── lib/format.ts         ← formatIQD, normalizeDigits, normalizeArabic, piecesLabel
    ├── lib/phone.ts          ← normalizeIraqiPhone
    ├── lib/catalog.ts        ← fetchProducts/fetchProductBySlug + مخزن الكتالوج + التصفية والترتيب
    ├── lib/product-mapping.ts ← تحويل صف قاعدة البيانات ↔ Product + التحقق والتنبيهات
    ├── lib/supabase-rest.ts  ← عميل REST/Auth/Storage فوق fetch
    ├── lib/images.ts         ← srcSetFor + قيم sizes لكل مكان
    ├── lib/storage.ts        ← قراءة/كتابة آمنة لـ localStorage
    ├── lib/*.test.ts         ← اختبارات vitest
    ├── hooks/useCatalog.ts, useAsync.ts, useSeo.ts
    ├── context/CartContext.tsx ← السلة (localStorage + مزامنة مع الكتالوج وبين التبويبات)
    ├── components/           ← Header, Footer, Layout, MobileNav, ProductCard, ProductImage, FabricArt, Brand, ui
    ├── pages/                ← Home, Shop, Product, Cart, About, Contact, Delivery, Returns, Faq, NotFound
    ├── admin/                ← (فرع admin-phase-1) AdminLayout, session, api, ProductsAdminPage, ProductEditorPage, ConfirmDialog
    └── styles/global.css     ← كل التصميم (ملف واحد، ~2000 سطر) + قسم لوحة التحكم بآخره
```

---

## 6) تفاصيل التنفيذ والقرارات التقنية

### قرارات أساسية
- **ملف CSS واحد** (`src/styles/global.css`) بمتغيرات تصميم:
  - الألوان: `--ivory #f8f5ef`، `--brown #49372e`، `--espresso #211915`، `--gold`، `--bronze`.
  - المسافات والحواف الآمنة: `--pad-l/--pad-r` (حواف آمنة)، `--header-h` (60، و76 من 768px).
- **نقاط التوقف:**
  - أقل من 600px: شريط سفلي، وعمودان للمنتجات.
  - 600px فما فوق: 3 أعمدة.
  - 768px فما فوق: صفحة المنتج بعمودين.
  - 900px فما فوق: قائمة الحاسوب، تصفية جانبية، بدون شريط شراء.
  - 1280px فما فوق: 4 أعمدة بالمتجر.
  - شاشات أفقية قصيرة `(orientation: landscape) and (max-height: 500px)` لها قواعد خاصة.
- **التصفية بالرابط** (`?category=&material=&color=&price=&stock=&sort=&q=&offers=`).
- **السلة:** مفتاح `sadan.cart.v1`. بيانات الزبونة تُحفظ في `sadan.customer.v1` ما عدا الملاحظات. السلة تُفرَّغ فقط بعد تأكيد الزبونة أنها أرسلت الطلب.
- **أفضل سعر:** `priceOrder` يجرّب تركيبات العروض لكل منتج ويختار الأرخص، والتوصيل المجاني يُحسب مرة واحدة.

### قرارات لوحة التحكم (فرع `admin-phase-1`)
- **عميل Supabase يدوي فوق `fetch`** بدل `@supabase/supabase-js`، لأن npm كان محجوباً ولتقليل الحجم.
- **المتجر يعمل بوضعين:**
  - بدون `VITE_SUPABASE_URL/ANON_KEY` يقرأ من الملف الثابت، بنفس السلوك القديم تماماً.
  - معها يقرأ المنتجات المنشورة من قاعدة البيانات، مع ذاكرة مؤقتة 60 ثانية (`CACHE_MS`).
- **مخزن كتالوج مركزي** (`getCatalogSnapshot/subscribeCatalog` + `useCatalog`) بدل استيراد `products` مباشرة. كانت 6 ملفات تستورده: Header, CartPage, DeliveryPage, HomePage, ProductPage, CartContext.
- **السلة ما تُطابَق مع الكتالوج إلا بعد تحميله**، حتى لا تنمسح أثناء التحميل. صفحة السلة تعرض محمّلاً حتى تتحمّل الأسعار والعروض.
- **صفحة المنتج تستلم كائن المنتج من `fetchProductBySlug`** بدل البحث بالـ id، حتى لا تنكسر إذا تحدّث الكتالوج.
- **صور الـ Hero:** نفس الـ slugs (`silk-lebanese-floral`, `georgette-ninja-shawl`) إذا كانت منشورة، وإلا أول منتجات بصور.
- **الصور ترفع كما هي بدون إعادة ضغط:** JPG/PNG/WebP حتى 5MB، بالمسار `products/<productId>/<timestamp>-<rand>.<ext>`. الصور التي تُزال قبل الحفظ، أو صور المنتج المحذوف، تنحذف من التخزين.
- **الجلسة:** `sudun.admin.session.v1` في localStorage، ويتجدد الرمز تلقائياً قبل انتهائه. كلمة المرور لا تُحفظ أبداً.
- **حماية المفتاح:** `isSecretKey()` يرفض أي مفتاح `service_role` أو `sb_secret_` وُضع بالخطأ مكان المفتاح العام.
- **مسارات `/admin` موضوعة قبل مجموعة `Layout`** في `App.tsx`، ولها إطار منفصل بدون هيدر أو فوتر المتجر، وهي `noindex`.
- **معاينات Netlify** (`deploy-preview`/`branch-deploy`) تشغّل `npm run build:check`. الإنتاج يبقى بـ `npm run build`.

### مشاكل واجهناها وحلولها
| المشكلة | الحل |
|---|---|
| npm وGoogle Fonts وCDN وSupabase وNetlify محجوبة في بيئة المحادثة | أداة بناء بديلة esbuild + shims في `sandbox-tools/`. البناء الحقيقي يتم على Netlify |
| فحص التمرير الأفقي كان يخطئ مع محاكاة الموبايل | المقارنة بالعرض المضبوط بدل `innerWidth` |
| شريط الشراء ما يظهر بالقفز السريع (IntersectionObserver) | استبدال بمستمع scroll + rAF |
| عرض الشيفون يكلّف الزبونة أكثر | محسّن أفضل سعر |
| تغطية الأشرطة الثابتة 80% بالوضع الأفقي | قواعد الشاشات القصيرة + ثبات جزئي لشريط التصفية |
| GitHub غير ظاهر في Browse connectors | GitHub Integration في Customize ← Connectors (قراءة فقط)، والرفع احتاج ربط Claude Code بـ claude.ai/code + تثبيت Claude GitHub App |
| خطأ TypeScript قديم: `product.material === 'satin'` بـ `ProductImage.tsx` (خامة غير موجودة) | استُبدل بـ `'silk-lebanese'`. يؤثر فقط على الرسمة البديلة عند غياب الصورة |
| الفرع المرفوع ما كان مربوطاً محلياً (تنبيه stop hook) | ضبط upstream وrefspec للفرع |

### أدوات الاختبار (`sandbox-tools/` — خاصة ببيئة المحادثة)
- مسارات مكتوبة صراحة تخص تلك البيئة:
  - Playwright من `/home/claude/.npm-global/...`.
  - Chromium من `/opt/pw-browsers/chromium-1194/...`.
  - esbuild من `/opt/npm-tools/...`.
  - PostgreSQL من `/usr/lib/postgresql/16/bin`.
- **على جهاز آخر تحتاج تعديل هذه المسارات.**

| الأداة | ماذا تفعل |
|---|---|
| `build.mjs` | يبني إلى `.sandbox-build` (أو `--out=`). يعرّف `import.meta.env.VITE_SUPABASE_*`، ويولّد `supabase/seed_products.sql` و`seed-rows.json` |
| `shims/` | بدائل `react-router-dom` (hash router)، `lucide-react` (أيقونات مرسومة يدوياً — **أي أيقونة جديدة يجب إضافتها هنا**)، `vitest` |
| `run-all.sh` | الوحدات + checkout-e2e + functional-matrix + responsive-audit + buybar + orientation (يحتاج خادماً على 4173) |
| `run-admin-tests.sh` | sql-test + admin-e2e + checkout/matrix/audit على المتجر المربوط بقاعدة البيانات (يشغّل mock على 54321 والموقع على 4174) |
| `sql-test.sh` | PostgreSQL حقيقي + بديل مبسّط لـ auth/storage، ويختبر RLS |
| `mock-supabase.mjs` | محاكاة Auth/PostgREST/Storage بنفس قواعد الصلاحيات. حسابات الاختبار فيه وهمية للاختبار المحلي فقط |
| `gen-seed.ts`, `image-weight.mjs`, `orientation-audit.mjs`, `buybar-check.mjs` | توليد البذرة، قياس الصور، الاتجاهات، شريط الشراء |
| `e2e.mjs`, `wa-flow.mjs`, `shots.mjs`, `look.mjs`, `preview.mjs` | **أدوات قديمة** من أول المشروع. بعضها يشير إلى slugs تجريبية قديمة (مثل `jersey-everyday`) وغير محدّث |

### آخر نتائج اختبار فعلية (بيئة المحادثة، Chromium فقط)
| الاختبار | النتيجة |
|---|---|
| وحدات (vitest عبر shim) | 32/32 |
| SQL/RLS على PostgreSQL 16 | 38/38 |
| لوحة التحكم بالمتصفح | 90/90 |
| checkout-e2e: بدون قاعدة بيانات / مع mock | 60/60 · 60/60 |
| functional-matrix: بدون / مع mock | 210/210 · 210/210 |
| responsive-audit (308 تشغيل): بدون / مع mock | 0 ملاحظات · 0 ملاحظات |
| buybar-check | 44/44 |
| orientation-audit | 144 تشغيل، ملاحظة واحدة معروفة (القسم 9) |

---

## 7) قاعدة البيانات وواجهات API (Supabase — غير مُنشأة بعد)

### الجداول (`supabase/migrations/001_products_admin.sql`)
**`public.admins`**
- الأعمدة: `user_id uuid PK → auth.users`، `created_at`.
- RLS: المستخدم يقرأ صفه فقط. الإضافة والحذف من SQL Editor فقط.

**`public.products`**
| العمود | النوع/القيد |
|---|---|
| `id` | text PK (المنتجات الحالية `sd-001`…`sd-007`، والجديدة `p-…`) |
| `slug` | text unique، `^[a-z0-9]+(-[a-z0-9]+)*$`، حتى 80 حرف |
| `name` | text، من 1 إلى 120 حرف |
| `short_description`, `description` | text |
| `category` | `rabta`, `shawl`, `ninja`, `shash` |
| `material` | null أو `silk-lebanese`, `chiffon`, `georgette`, `organza`, `cotton`, `jafsa` |
| `colors` | jsonb array من `{name, hex, family, available?, images?}` |
| `sizes`, `images`, `care` | jsonb arrays |
| `price` | integer > 0 |
| `compare_at_price` | null أو أكبر من `price` |
| `offer` | null أو `{quantity: 2..20, price > 0, freeDelivery}` |
| `is_new`, `is_best_seller` | boolean |
| `stock_qty` | null (غير محددة = متوفر) أو ≥ 0 |
| `added_at` | date |
| `status` | `published` أو `hidden` (الافتراضي `hidden`) |
| `sort_order` | integer |
| `created_at`, `updated_at` | `updated_at` يتحدث بـ trigger |

- **دالة** `public.is_admin()`: `security definer`.
- **سياسات RLS:**
  - القراءة: `status='published' or is_admin()`.
  - الإضافة والتعديل والحذف: `is_admin()` فقط.
- **Storage:**
  - حاوية `product-images` عامة للقراءة، حدها 5MB، وتقبل jpeg/png/webp فقط.
  - الرفع والتعديل والحذف والقراءة عبر الـ API للمدير فقط.
- **البذرة** `supabase/seed_products.sql`:
  - المنتجات السبعة بـ `on conflict (id) do nothing`، فلا تكتب فوق تعديلات اللوحة.
  - مولَّدة من `products.ts` عبر `sandbox-tools/gen-seed.ts`.

### المسارات التي يستدعيها الموقع (`src/lib/supabase-rest.ts`)
- `GET /rest/v1/products?select=*&status=eq.published&order=...` للمتجر (بالمفتاح العام).
- `GET/POST/PATCH/DELETE /rest/v1/products?id=eq.<id>` للوحة (برمز المدير، `Prefer: return=representation`).
- `GET /rest/v1/admins?select=user_id&user_id=eq.<uid>` للتحقق من أن الحساب مدير.
- `POST /auth/v1/token?grant_type=password|refresh_token`، `POST /auth/v1/logout`.
- `POST /storage/v1/object/product-images/<path>`، `DELETE /storage/v1/object/product-images` (`{prefixes}`)، والرابط العام `/storage/v1/object/public/product-images/<path>`.

### متغيرات البيئة (أسماء فقط — القيم لا تُكتب بالمستودع)
- `VITE_SUPABASE_URL`: رابط مشروع Supabase.
- `VITE_SUPABASE_ANON_KEY`: **المفتاح العام فقط** (anon أو `sb_publishable_`). ممنوع `service_role` و`sb_secret_`.
- تُضاف في Netlify ← Site configuration ← Environment variables.

---

## 8) التصميم والواجهات

### صفحات المتجر (مسارات React Router)
| المسار | الصفحة |
|---|---|
| `/` | الرئيسية: Hero داكن بصورتين بشكل قوس، حقائق التوصيل والدفع، دوائر الأنواع، شريط «أحدث القطع»، العروض، قصة البراند، التصفح حسب الخامة واللون، «شلون تطلبين؟»، شبكة إنستغرام، الأسئلة |
| `/shop` | المتجر: بحث، اختصارات الأنواع، تصفية (جانبية من 900px فما فوق، ولوحة سفلية تحتها)، ترتيب |
| `/product/:slug` | المنتج: معرض صور، الألوان والقياسات، الكمية، «أضيفي إلى السلة» و«اطلبي الآن»، شريط شراء ثابت (تحت 900px، أو أفقي قصير)، «من نفس الذوق» |
| `/cart` | السلة ونموذج الطلب ← واتساب ← شاشة التأكيد |
| `/about`, `/contact`, `/delivery`, `/returns`, `/faq`, `*` (404) | صفحات المعلومات |

### لوحة التحكم (فرع `admin-phase-1`)
| المسار | الصفحة |
|---|---|
| `/admin` | الدخول، ثم قائمة المنتجات (بحث، فلتر الكل/منشور/مخفي، تعديل، نشر/إخفاء، حذف بنافذة تأكيد) |
| `/admin/products/new` | إضافة منتج |
| `/admin/products/:id` | تعديل منتج |

- **التنقل:**
  - الهيدر: شريط إعلان، شعار بالوسط، قائمة جانبية (drawer)، بحث، سلة.
  - الحاسوب: روابط بالهيدر.
  - الموبايل تحت 600px: شريط سفلي فيه الرئيسية، المتجر، العروض، السلة، واتساب. هذا الشريط مخفي بصفحة المنتج وبالوضع الأفقي القصير.
  - اللوحة: شريط داكن فيه المنتجات، منتج جديد، المتجر، خروج.
- **متطلبات بصرية ثابتة:**
  - اتجاه RTL.
  - أهداف لمس ≥40–44px.
  - لا تمرير أفقي.
  - دعم لوحة المفاتيح (focus trap للنوافذ و Escape).
  - تكبير النص حتى 200%.
  - Safe Areas.
  - صور المنتجات الأصلية **لا تُستبدل ولا تُعدّل ألوانها**.

---

## 9) الأخطاء والمشاكل المعروفة

1. **لابتوب 960×800، منتج «ربطة حرير لبناني مشجر»:** زر الإضافة ينزل نحو 70px تحت أول شاشة. السبب: الاسم ينطوي لسطرين، وفوق الزر عرض وقياس، ولا يوجد شريط شراء على الحاسوب. أُبقي عمداً.
2. **فرع `admin-phase-1` لم يُبنَ بـ Vite ولم يمر بـ `tsc -b` كامل.** إذا فشلت معاينة Netlify، راجع سجل البناء أولاً.
3. **تأخير ظهور التعديلات:** الزبونة التي صفحتها مفتوحة ترى تعديلات اللوحة خلال دقيقة كحد أقصى بسبب `CACHE_MS`. فتح الموقع من جديد يظهرها فوراً.
4. **المخزون لا ينقص تلقائياً** عند الطلب، لأن الطلبات تمر عبر واتساب.
5. **الصور المرفوعة من اللوحة** ليس لها نسخ مصغّرة (`srcset`)، فتتحمّل بحجمها الأصلي.
6. **الأنواع والخامات وعائلات الألوان ثابتة بالكود** (`taxonomy.ts` + قيود SQL). إضافة نوع جديد تحتاج تعديل الاثنين معاً.
7. **صور تبقى يتيمة بالتخزين** إذا أُغلق المتصفح فجأة أثناء إضافة منتج قبل الحفظ.
8. **مشروع Supabase المجاني يتوقف بعد أسبوع بدون نشاط** (حسب مصدر ثانوي، غير مؤكد من صفحة الأسعار الرسمية). إذا توقف تظهر رسالة خطأ بالمتجر بدل المنتجات، ويُعاد تشغيله من لوحة Supabase.
9. **`siteUrl` ما زال `https://example.com`**، فروابط Open Graph والـ canonical غير صحيحة حتى يُضبط الدومين.
10. **أدوات `sandbox-tools` القديمة** (`e2e.mjs`, `wa-flow.mjs`, `shots.mjs`, `look.mjs`, `preview.mjs`) غير محدّثة.
11. **README** ما زال يذكر أن منتجات `products.ts` «تجريبية الآن» في هيكل المشروع. الصحيح أنها حقيقية. يحتاج تصحيح نصّي.

---

## 10) الخطوات القادمة (حسب الأولوية)

1. **تشغيل اللوحة فعلياً (المالكة، حسب `docs/ADMIN_SETUP.md`):**
   - إنشاء مشروع Supabase مجاني.
   - تشغيل `001_products_admin.sql` ثم `seed_products.sql`.
   - إنشاء مستخدم المدير وإضافته إلى `admins`.
   - إطفاء التسجيل الجديد.
   - إضافة `VITE_SUPABASE_URL` و`VITE_SUPABASE_ANON_KEY` في Netlify.
2. **مراجعة معاينة PR #1** على Netlify: نجاح `build:check`، ثم فتح `/admin` على المعاينة وتجربة إضافة وتعديل وإخفاء وحذف منتج تجريبي مخفي، ومقارنة `/shop` بالموقع الحالي.
3. **دمج PR #1 في `main`** بعد نجاح المعاينة، ثم فحص الموقع المنشور.
4. **تصحيحات صغيرة:** نص README عن «تجريبية»، وتحديث أو حذف أدوات `sandbox-tools` القديمة.
5. **مرحلة 2 للوحة (مقترحة):**
   - نسخ مصغّرة للصور المرفوعة.
   - ترتيب المنتجات (`sort_order`) من الواجهة.
   - تعديل نصوص الإعلان والتوصيل من اللوحة (يحتاج جدول إعدادات).
   - سجل تعديلات.
6. **إدارة الطلبات (مقترحة):** تسجيل الطلب بقاعدة البيانات قبل فتح واتساب، وإنقاص المخزون. يحتاج تصميم صلاحيات إدراج للزبائن بحذر (rate limiting).
7. **بيانات من المالكة:** سياسة الاستبدال، القياسات، الألوان، منتجات وصور جديدة (تُضاف من اللوحة بعد تفعيلها).
8. **الدومين:** ربط دومين، ثم تحديث `siteUrl` و`og:image` في `index.html`.

---

## 11) آخر نقطة وصلنا إليها

- **آخر عمل منفّذ:** لوحة التحكم المرحلة الأولى على فرع `admin-phase-1` (commit `deed582`)، رُفعت إلى GitHub، و`main` بقي على `d5faf27` حتى لا يتغير الموقع المنشور. ثم أُصلح ربط الفرع المحلي بالبعيد بعد تنبيه stop hook. بعدها كُتب هذا الملف وأُضيف إلى نفس الفرع.
- **ما حدث بعدها على GitHub (من فحص `git ls-remote`):** يوجد **PR #1** (`refs/pull/1/head = deed582`) غير مدموج. لم أتمكن من رؤية حالة معاينة Netlify أو تعليقاتها.
- **الخطوة التالية مباشرة:**
  1. المالكة تتأكد من نتيجة معاينة Netlify لـ PR #1 (نجح أو فشل، مع سجل البناء إن فشل).
  2. المالكة تجهّز Supabase وتضيف المتغيرات في Netlify.
  3. نختبر `/admin` على المعاينة.
  4. ندمج PR #1.

---

## 12) تعليمات للمساعد الجديد

1. **ابدأ بالقراءة بدون تعديل:** هذا الملف، ثم `README.md`، ثم `docs/ADMIN_SETUP.md`، ثم `src/types.ts`، `src/config/site.ts`، `src/data/products.ts`، `src/lib/cart-math.ts`، `src/lib/whatsapp.ts`، `src/lib/catalog.ts`، `src/lib/product-mapping.ts`، `src/App.tsx`، ثم `supabase/migrations/001_products_admin.sql`.
2. **تحقق من حالة Git أولاً:** `git fetch --all` ثم `git log --oneline -5 origin/main origin/admin-phase-1`، وافحص حالة PR #1 على GitHub. لا تفترض أن ما بهذا الملف ما زال صحيحاً إذا تغيّر الـ commit.
3. **لا تغيّر أبداً بدون طلب صريح:** رقم واتساب، أجور التوصيل، الأسعار، العروض، المنتجات وصورها الأصلية، ومنطق `priceOrder` ورسالة واتساب. توجد اختبارات تؤكد رقم واتساب والأجور في `src/lib/order.test.ts`.
4. **لا تعِد بناء المشروع من الصفر،** ولا تضف مكتبات بدون حاجة. Supabase مقصود بدون SDK.
5. **لا تضع أسراراً بالكود:** فقط المفتاح العام بمتغيرات Netlify. `service_role` لا يُستخدم بالواجهة إطلاقاً.
6. **اعمل على فرع جديد، لا على `main` مباشرة.** افتح PR واعتمد على معاينة Netlify، التي تشغّل `npm run build:check` بفضل `netlify.toml`.
7. **الاختبارات:**
   - على جهاز عادي: `npm install` ثم `npm test` و`npm run build:check`.
   - أدوات `sandbox-tools/` تحتاج Playwright وتعديل المسارات المكتوبة صراحة. `sql-test.sh` يحتاج PostgreSQL 16 محلياً.
   - أي أيقونة lucide جديدة يجب إضافتها إلى `sandbox-tools/shims/lucide-react.tsx` حتى تعمل أدوات البناء البديلة.
8. **عند تعديل `src/data/products.ts`:** أعد توليد `supabase/seed_products.sql` (عبر `sandbox-tools/build.mjs` أو بنفس منطق `gen-seed.ts`). بعد تفعيل Supabase يصبح **مصدر الحقيقة هو قاعدة البيانات**، والملف الثابت يبقى احتياطياً فقط.
9. **عند إضافة نوع أو خامة:** عدّل `src/data/taxonomy.ts` و`src/types.ts` وقيود `check` في SQL بـ migration جديدة (`002_...sql`). لا تعدّل `001` بعد تشغيله.
10. **التصميم:** كل CSS في `global.css` (قسم اللوحة بآخره). حافظ على RTL وأهداف اللمس ≥40px وعدم التمرير الأفقي، وافحص على 320–1920px بالاتجاهين.
11. **الصدق:** لا تدّعِ نجاح بناء أو نشر أو اختبار إلا بعد تشغيله فعلياً. المالكة طلبت هذا صراحة وبشكل متكرر.
12. **التواصل:** المالكة تكتب بالعربية (لهجة عراقية) وتعمل غالباً من الموبايل. أعطها خطوات واضحة وقصيرة ولا تطلب منها أوامر terminal إن أمكن.

### معلومات غير متوفرة لدي
- نتيجة معاينة Netlify لـ PR #1، وإعدادات حساب Netlify (مثل متغيرات البيئة الحالية وتفعيل branch deploys).
- هل أنشأت المالكة مشروع Supabase بعد آخر رسالة.
- نوع اشتراك المالكة في Claude.
- القياسات والألوان وسياسة الاستبدال والدومين.
