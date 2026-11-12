#!/usr/bin/env bash
# Sandbox-only: يشغّل ملفات supabase/*.sql على PostgreSQL 16 حقيقي (محلي) مع بديل مبسّط لـ auth/storage
# الخاصة بـ Supabase، ويتحقق فعلياً من سياسات الصلاحيات (RLS). لا يحتاج إنترنت.
set -u
cd "$(dirname "$0")/.."
PG=/usr/lib/postgresql/16/bin
DIR=$(mktemp -d /tmp/sudun-pg.XXXX); PORT=55432
chown -R postgres "$DIR" 2>/dev/null
as_pg() { if [ "$(id -u)" = 0 ]; then su postgres -s /bin/bash -c "$*"; else bash -c "$*"; fi; }
as_pg "$PG/initdb -D $DIR/data -U postgres -A trust >/dev/null" || exit 1
as_pg "$PG/pg_ctl -D $DIR/data -o '-p $PORT -k $DIR' -l $DIR/log start -w >/dev/null" || { cat $DIR/log; exit 1; }
trap 'as_pg "$PG/pg_ctl -D $DIR/data stop -m fast >/dev/null"; rm -rf $DIR' EXIT
PSQL="psql -h $DIR -p $PORT -U postgres -d postgres -v ON_ERROR_STOP=1 -q"

# بديل Supabase: الأدوار، auth.uid() من request.jwt.claims، وجداول storage
$PSQL <<'SQL' || exit 1
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth; create schema storage;
grant usage on schema public, auth, storage to anon, authenticated;
-- مثل Supabase: صلاحيات الجداول الافتراضية مفتوحة للأدوار، والحماية الفعلية من RLS
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on functions to anon, authenticated;
create table auth.users (id uuid primary key, email text unique);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', ''), '')::uuid $$;
grant execute on function auth.uid() to anon, authenticated;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text, owner uuid);
alter table storage.objects enable row level security;
grant select, insert, update, delete on storage.objects to anon, authenticated;
insert into auth.users values ('00000000-0000-0000-0000-00000000000a', 'admin@sudun.test'), ('00000000-0000-0000-0000-00000000000b', 'customer@sudun.test');
SQL

pass=0; fail=0
ok() { if [ "$1" = "$2" ]; then pass=$((pass+1)); echo "  ✓ $3"; else fail=$((fail+1)); echo "  ✗ $3 (المتوقع: $2 — الناتج: $1)"; fi; }
# تشغيل استعلام بدور معيّن: as <role> <user-uuid|-> <sql>
as() { local role=$1 sub=$2 sql=$3 claims='{}'; [ "$sub" != "-" ] && claims="{\"sub\":\"$sub\",\"role\":\"$role\"}";
  $PSQL -At -c "begin; set local role $role; set local request.jwt.claims = '$claims'; $sql; commit;" 2>&1 | tail -1; }
ADMIN=00000000-0000-0000-0000-00000000000a; USER=00000000-0000-0000-0000-00000000000b

echo "## تشغيل ملفات SQL (مرتين للتأكد أنها آمنة لإعادة التشغيل)"
for i in 1 2; do
  $PSQL -f supabase/migrations/001_products_admin.sql >/dev/null 2>$DIR/err && $PSQL -f supabase/seed_products.sql >/dev/null 2>>$DIR/err
  rc=$?; ok "$rc" "0" "تشغيل رقم $i بدون أخطاء"; [ "$rc" = 0 ] || grep -m3 ERROR $DIR/err
done
$PSQL -c "insert into public.admins (user_id) select id from auth.users where email = 'admin@sudun.test';"

echo "## البيانات"
ok "$($PSQL -At -c "select count(*) from public.products")" "7" "7 منتجات حقيقية بعد البذرة (بدون تكرار)"
ok "$($PSQL -At -c "select price||'/'||(offer->>'quantity')||'/'||(offer->>'price')||'/'||(offer->>'freeDelivery') from public.products where id='sd-002'")" "8000/3/25000/true" "سعر وعرض الشيفون مطابق"
ok "$($PSQL -At -c "select count(*) from public.products where status='published'")" "7" "كل المنتجات الحالية منشورة"

echo "## الزبائن (anon)"
$PSQL -c "update public.products set status='hidden' where id='sd-007'"
 ok "$(as anon - "delete from public.products returning id" | grep -c 'sd-')" "0" "الزبونة ما تقدر تحذف"
ok "$(as anon - "select count(*) from public.products")" "6" "الزبونة تشوف المنشور فقط (المخفي مخفي)"
ok "$(as anon - "select count(*) from public.products where id='sd-007'")" "0" "المنتج المخفي غير قابل للقراءة"
ok "$(as anon - "update public.products set price=1 where id='sd-001' returning id" | grep -c 'sd-001')" "0" "الزبونة ما تقدر تعدّل"
ok "$(as anon - "insert into public.products (slug,name,category,price) values ('x','x','shawl',1)" | grep -c 'row-level security\|permission denied')" "1" "الزبونة ما تقدر تضيف"
ok "$(as anon - "select count(*) from public.admins" | grep -c 'permission denied\|^0$')" "1" "الزبونة ما تشوف جدول المدراء"

echo "## حساب مسجّل غير مدير"
ok "$(as authenticated $USER "select count(*) from public.products")" "6" "يشوف المنشور فقط"
ok "$(as authenticated $USER "update public.products set price=1 where id='sd-001' returning id")" "" "التعديل ما يأثر على أي صف"
ok "$(as authenticated $USER "delete from public.products where id='sd-001' returning id")" "" "الحذف ما يأثر على أي صف"
ok "$(as authenticated $USER "insert into public.products (slug,name,category,price) values ('hack','x','shawl',1)" | grep -c 'row-level security')" "1" "الإضافة مرفوضة بسياسة RLS"
ok "$(as authenticated $USER "insert into public.admins values ('$USER')" | grep -c 'denied\|row-level')" "1" "ما يقدر يخلي نفسه مدير"
ok "$(as authenticated $USER "select count(*) from public.admins")" "0" "ما يشوف المدراء"
ok "$(as authenticated $USER "insert into storage.objects (bucket_id,name) values ('product-images','x.webp')" | grep -c 'row-level security')" "1" "ما يقدر يرفع صور"
ok "$($PSQL -At -c "select price from public.products where id='sd-001'")" "12000" "السعر الأصلي ما تغيّر"

echo "## المدير"
ok "$(as authenticated $ADMIN "select count(*) from public.admins")" "1" "المدير يعرف إنه مدير"
ok "$(as authenticated $ADMIN "select count(*) from public.products")" "7" "يشوف المخفي أيضاً"
ok "$(as authenticated $ADMIN "insert into public.products (slug,name,category,price,status,colors) values ('new-item','منتج جديد','shawl',15000,'published','[{\"name\":\"أسود\",\"hex\":\"#111111\",\"family\":\"black\"}]') returning slug")" "new-item" "يضيف منتج"
ok "$(as authenticated $ADMIN "update public.products set price=11000, compare_at_price=14000 where slug='new-item' returning price")" "11000" "يعدّل السعر والسعر قبل الخصم"
ok "$(as anon - "select price||'/'||compare_at_price from public.products where slug='new-item'")" "11000/14000" "التعديل يظهر للزبونة فوراً"
ok "$(as authenticated $ADMIN "update public.products set status='hidden' where slug='new-item' returning status")" "hidden" "يخفي منتج"
ok "$(as anon - "select count(*) from public.products where slug='new-item'")" "0" "المخفي يختفي من المتجر"
ok "$(as authenticated $ADMIN "delete from public.products where slug='new-item' returning slug")" "new-item" "يحذف منتج"
ok "$(as authenticated $ADMIN "insert into storage.objects (bucket_id,name) values ('product-images','products/a.webp') returning name")" "products/a.webp" "يرفع صورة"
ok "$(as authenticated $ADMIN "delete from storage.objects where name='products/a.webp' returning name")" "products/a.webp" "يحذف صورة"
ok "$(as authenticated $ADMIN "insert into storage.objects (bucket_id,name) values ('other','x')" | grep -c 'row-level security\|foreign key')" "1" "ما يرفع لحاوية ثانية"

echo "## قيود البيانات"
ok "$(as authenticated $ADMIN "insert into public.products (slug,name,category,price) values ('Bad Slug','x','shawl',1)" | grep -c 'check constraint')" "1" "رابط بحروف غير مسموحة مرفوض"
ok "$(as authenticated $ADMIN "insert into public.products (slug,name,category,price) values ('zero','x','shawl',0)" | grep -c 'check constraint')" "1" "سعر صفر مرفوض"
ok "$(as authenticated $ADMIN "insert into public.products (slug,name,category,price,compare_at_price) values ('cmp','x','shawl',10000,9000)" | grep -c 'check constraint')" "1" "سعر قبل الخصم أقل من الحالي مرفوض"
ok "$(as authenticated $ADMIN "insert into public.products (slug,name,category,price,offer) values ('off','x','shawl',10000,'{\"quantity\":1,\"price\":5}')" | grep -c 'check constraint')" "1" "عرض بقطعة وحدة مرفوض"
ok "$(as authenticated $ADMIN "insert into public.products (slug,name,category,price) values ('cat','x','hats',1)" | grep -c 'check constraint')" "1" "نوع غير معروف مرفوض"
ok "$(as authenticated $ADMIN "insert into public.products (slug,name,category,price,stock_qty) values ('neg','x','shawl',1,-1)" | grep -c 'check constraint')" "1" "كمية سالبة مرفوضة"
ok "$(as authenticated $ADMIN "insert into public.products (slug,name,category,price) values ('silk-lebanese-floral','x','shawl',1)" | grep -c 'duplicate key')" "1" "رابط مكرر مرفوض"
before=$($PSQL -At -c "select updated_at from public.products where id='sd-001'"); sleep 1
as authenticated $ADMIN "update public.products set description=description where id='sd-001'" >/dev/null
ok "$([ "$($PSQL -At -c "select updated_at from public.products where id='sd-001'")" != "$before" ] && echo y)" "y" "updated_at يتحدث تلقائياً"

echo "sql: $pass passed, $fail failed"
[ "$fail" = 0 ]
