-- =====================================================================
-- سُدَن | SUDUN — قاعدة بيانات المنتجات ولوحة التحكم (Supabase)
-- يُشغَّل مرة وحدة من: Supabase → SQL Editor → New query → الصقي الملف → Run
-- آمن لإعادة التشغيل (يستخدم if not exists / or replace).
--
-- الصلاحيات (RLS):
--   الزبائن (anon)        : قراءة المنتجات المنشورة فقط.
--   المدير (جدول admins)  : قراءة كل المنتجات + إضافة/تعديل/حذف + رفع وحذف الصور.
--   أي حساب آخر مسجّل     : مثل الزبائن تماماً (لا يقدر يعدّل شي).
-- =====================================================================

-- ---------- المدراء ----------
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

-- كل مستخدم يقدر يعرف إذا هو مدير أو لا (يشوف صفه فقط). الإضافة/الحذف من SQL Editor فقط.
drop policy if exists "admins: read own row" on public.admins;
create policy "admins: read own row" on public.admins
  for select to authenticated
  using (user_id = auth.uid());

-- دالة مساعدة تُستخدم بالسياسات (security definer حتى تقرأ جدول admins بدون حلقة صلاحيات)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------- المنتجات ----------
create table if not exists public.products (
  id                text primary key default ('p-' || substr(md5(random()::text || clock_timestamp()::text), 1, 10)),
  slug              text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  name              text not null check (char_length(btrim(name)) between 1 and 120),
  short_description text not null default '',
  description       text not null default '',
  category          text not null check (category in ('rabta', 'shawl', 'ninja', 'shash')),
  material          text check (material is null or material in ('silk-lebanese', 'chiffon', 'georgette', 'organza', 'cotton', 'jafsa')),
  colors            jsonb not null default '[]'::jsonb check (jsonb_typeof(colors) = 'array'),
  sizes             jsonb not null default '[]'::jsonb check (jsonb_typeof(sizes) = 'array'),
  price             integer not null check (price > 0),
  compare_at_price  integer check (compare_at_price is null or compare_at_price > price),
  offer             jsonb check (
                      offer is null or (
                        jsonb_typeof(offer) = 'object'
                        and (offer ->> 'quantity')::int between 2 and 20
                        and (offer ->> 'price')::int > 0
                      )
                    ),
  is_new            boolean not null default false,
  is_best_seller    boolean not null default false,
  stock_qty         integer check (stock_qty is null or stock_qty >= 0),   -- null = غير محددة (متوفر)
  images            jsonb not null default '[]'::jsonb check (jsonb_typeof(images) = 'array'),
  care              jsonb not null default '[]'::jsonb check (jsonb_typeof(care) = 'array'),
  added_at          date,
  status            text not null default 'hidden' check (status in ('published', 'hidden')),
  sort_order        integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists products_status_idx on public.products (status, sort_order);

-- تحديث updated_at تلقائياً
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists products_touch_updated_at on public.products;
create trigger products_touch_updated_at
  before update on public.products
  for each row execute function public.touch_updated_at();

alter table public.products enable row level security;

drop policy if exists "products: public reads published" on public.products;
create policy "products: public reads published" on public.products
  for select to anon, authenticated
  using (status = 'published' or public.is_admin());

drop policy if exists "products: admin inserts" on public.products;
create policy "products: admin inserts" on public.products
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists "products: admin updates" on public.products;
create policy "products: admin updates" on public.products
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "products: admin deletes" on public.products;
create policy "products: admin deletes" on public.products
  for delete to authenticated
  using (public.is_admin());

grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
grant select on public.admins to authenticated;

-- ---------- صور المنتجات (Storage) ----------
-- حاوية عامة للقراءة (روابط الصور تفتح للزبائن)، والرفع والحذف للمدير فقط.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "product images: admin uploads" on storage.objects;
create policy "product images: admin uploads" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "product images: admin updates" on storage.objects;
create policy "product images: admin updates" on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "product images: admin deletes" on storage.objects;
create policy "product images: admin deletes" on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images' and public.is_admin());

-- الحذف عبر الـ API يحتاج قراءة الصف أولاً
drop policy if exists "product images: admin reads" on storage.objects;
create policy "product images: admin reads" on storage.objects
  for select to authenticated
  using (bucket_id = 'product-images' and public.is_admin());
