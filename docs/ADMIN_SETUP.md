# تشغيل لوحة التحكم (Supabase المجاني + Cloudflare Workers)

اللوحة على الرابط `/admin`. تحفظ المنتجات بقاعدة بيانات Supabase بشكل دائم، والزبائن يشوفون التعديلات بعد الحفظ مباشرة (عند فتح الموقع، أو خلال دقيقة كحد أقصى لمن الصفحة مفتوحة عنده).

> **قبل الإعداد** يبقى المتجر يشتغل من الملف الثابت `src/data/products.ts` بدون أي تغيير، واللوحة تعرض رسالة «قاعدة البيانات غير مربوطة بعد».

## 1) إنشاء مشروع Supabase (مجاني)
1. ادخلي [supabase.com](https://supabase.com) ← **Start your project** ← سجّلي (يفضّل بحساب GitHub).
2. **New project**: الاسم `sudun-store`، اكتبي كلمة مرور قوية لقاعدة البيانات واحفظيها عندچ (ما تنحط بالموقع أبداً)، والمنطقة الأقرب (مثلاً Frankfurt).
3. انتظري لحد ما يجهز المشروع (دقيقتين تقريباً).

## 2) إنشاء الجداول والصلاحيات والمنتجات الحالية
1. من القائمة: **SQL Editor** ← **New query**.
2. الصقي محتوى `supabase/migrations/001_products_admin.sql` كاملاً ← **Run**. يجب أن تظهر «Success».
3. **New query** ثانية ← الصقي `supabase/seed_products.sql` ← **Run**. هذا يضيف المنتجات السبعة الحقيقية كما هي (آمن لو انعاد، ما يكتب فوق تعديلاتچ).
4. للتأكد: **Table Editor** ← `products` ← لازم تشوفين 7 صفوف.

## 3) حساب المدير
1. **Authentication** ← **Users** ← **Add user** ← **Create new user**: بريدچ وكلمة مرور قوية، وفعّلي **Auto Confirm User**.
2. **SQL Editor** ← شغّلي (غيّري البريد لبريدچ):
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'YOUR_EMAIL@example.com';
   ```
   يجب أن تظهر `INSERT 0 1`. إذا ظهر `INSERT 0 0` فالبريد غير مطابق.
3. **مهم:** **Authentication** ← **Sign In / Providers** ← أطفئي **Allow new users to sign up**. (حتى لو بقيت مفعّلة، أي حساب جديد ما يقدر يعدّل شي لأنه مو بجدول admins — بس الأفضل إطفاؤها.)

## 4) ربط الموقع (Cloudflare Workers Builds)
1. Supabase ← **Project Settings** ← **API** (أو **API Keys**): انسخي
   - **Project URL** مثل `https://abcd1234.supabase.co`
   - المفتاح العام **anon public** (أو **Publishable key** الذي يبدأ بـ `sb_publishable_`)
   - ⚠️ **لا تنسخي** `service_role` ولا أي مفتاح يبدأ بـ `sb_secret_`. هذا سري ولا يوضع بالموقع. (الموقع يرفضه تلقائياً لو انحط بالغلط.)
2. Cloudflare Dashboard ← Workers & Pages ← Worker `sudun-store` ← Settings / Builds ← **Environment variables**:
   - `VITE_SUPABASE_URL` = Project URL
   - `VITE_SUPABASE_ANON_KEY` = المفتاح العام
3. احفظي الإعدادات ثم شغّلي Build جديداً للفرع المطلوب.
4. افتحي `https://<موقعچ>/admin` وسجّلي الدخول.

## 5) إعداد تغيير كلمة مرور المدير من داخل اللوحة\n1. من Cloudflare افتحي Worker `sudun-store` ثم **Settings → Variables and Secrets**.\n2. أضيفي `SUPABASE_SECRET_KEY` كـ **Secret** (ليس Text/Plain variable) باستخدام مفتاح Supabase السري الذي يبدأ بـ `sb_secret_`. لا تضعيه في GitHub أو متغيرات `VITE_` أو المتصفح.\n3. تأكدي أن `SUPABASE_URL` و`SUPABASE_PUBLISHABLE_KEY` مضبوطتان كمتغيرات Worker runtime.\n4. بعد نشر نسخة Worker التي تتضمن endpoint، افتحي `/admin` ثم **كلمة المرور**. التحديث لا يعمل إلا بعد التحقق من جلسة المدير ووجود حسابه في جدول `admins`.\n\n## 6) فحص سريع بعد الربط
- `/shop` يعرض نفس المنتجات السبعة بنفس الأسعار.
- عدّلي سعر منتج من اللوحة ← افتحي صفحته بالمتجر بنافذة خاصة ← يظهر السعر الجديد.
- أخفي منتج ← يختفي من `/shop`.
- ارفعي صورة لمنتج تجريبي (مخفي) ← احذفيه بعدها.

## حدود الخطة المجانية (للعلم)
- قاعدة بيانات 500MB وتخزين صور 1GB وحركة بيانات 5GB شهرياً — كافية لمتجر بهذا الحجم.
- المشاريع المجانية **تتوقف بعد أسبوع بدون نشاط**؛ إذا توقف المشروع يرجع المتجر يعرض رسالة خطأ بدل المنتجات، وتشغيله من لوحة Supabase بزر **Restore**. زيارات المتجر المنتظمة تعتبر نشاطاً.

## الأمان باختصار
- الموقع ما يحتوي أي مفتاح سري؛ المفتاح العام مسموح يكون علني.
- كل الصلاحيات داخل قاعدة البيانات (RLS): الزبائن يقرأون المنشور فقط، والتعديل والحذف ورفع الصور للمدير فقط.
- الصور تنرفع كما هي بدون ضغط (JPG/PNG/WebP حتى 5MB).
