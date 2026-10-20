import { Eye, EyeOff, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ProductImage } from '../components/ProductImage';
import { ErrorState } from '../components/ui';
import { PageLoader } from '../components/Layout';
import { categories, materialLabel } from '../data/taxonomy';
import { formatIQD, normalizeArabic } from '../lib/format';
import type { AdminProduct } from '../lib/product-mapping';
import { deleteProduct, listAllProducts, setProductStatus } from './api';
import { ConfirmDialog } from './ConfirmDialog';
import { useAdmin } from './session';

type Filter = 'all' | 'published' | 'hidden';

/** قائمة كل المنتجات (المنشورة والمخفية) مع النشر/الإخفاء والحذف بعد التأكيد */
export default function ProductsAdminPage() {
  const { getToken } = useAdmin();
  const location = useLocation();
  const flash = (location.state as { flash?: string } | null)?.flash;
  const [items, setItems] = useState<AdminProduct[] | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(flash ?? '');
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [busyId, setBusyId] = useState('');
  const [toDelete, setToDelete] = useState<AdminProduct | null>(null);

  const load = useCallback(async () => {
    setError('');
    try {
      setItems(await listAllProducts(await getToken()));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذّر تحميل المنتجات.');
    }
  }, [getToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const shown = useMemo(() => {
    const needle = normalizeArabic(q);
    return (items ?? []).filter(
      (p) => (filter === 'all' || p.status === filter) && (!needle || normalizeArabic(`${p.name} ${p.slug}`).includes(needle)),
    );
  }, [items, q, filter]);

  const counts = useMemo(
    () => ({
      all: items?.length ?? 0,
      published: items?.filter((p) => p.status === 'published').length ?? 0,
      hidden: items?.filter((p) => p.status === 'hidden').length ?? 0,
    }),
    [items],
  );

  const toggle = async (p: AdminProduct) => {
    setBusyId(p.id);
    setNotice('');
    try {
      const next = p.status === 'published' ? 'hidden' : 'published';
      const saved = await setProductStatus(p.id, next, await getToken());
      setItems((list) => list?.map((x) => (x.id === saved.id ? saved : x)) ?? null);
      setNotice(next === 'published' ? `«${p.name}» صار منشوراً ويظهر للزبائن.` : `«${p.name}» صار مخفياً عن الزبائن.`);
    } catch (e) {
      setNotice('');
      setError(e instanceof Error ? e.message : 'تعذّر تغيير الحالة.');
    } finally {
      setBusyId('');
    }
  };

  const confirmDelete = async () => {
    const p = toDelete;
    if (!p) return;
    setBusyId(p.id);
    try {
      const { imagesLeft } = await deleteProduct(p, await getToken());
      setItems((list) => list?.filter((x) => x.id !== p.id) ?? null);
      setNotice(`تم حذف «${p.name}» نهائياً.${imagesLeft ? ` (${imagesLeft} صورة بقيت بالتخزين ولا تظهر بالمتجر)` : ''}`);
      setToDelete(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذّر الحذف.');
      setToDelete(null);
    } finally {
      setBusyId('');
    }
  };

  if (!items && !error) return <PageLoader />;

  return (
    <div className="admin-page">
      <div className="admin-page__head">
        <div>
          <h1 className="admin-title">المنتجات</h1>
          <p className="admin-muted">
            {counts.all} منتج · {counts.published} منشور · {counts.hidden} مخفي
          </p>
        </div>
        <Link to="/admin/products/new" className="btn btn--dark">
          <Plus size={18} aria-hidden="true" /> إضافة منتج
        </Link>
      </div>

      {notice && (
        <p className="admin-notice" role="status">
          {notice}
        </p>
      )}
      {error && <ErrorState message={error} onRetry={() => void load()} />}

      {items && (
        <>
          <div className="admin-toolbar">
            <div className="admin-search">
              <Search size={18} aria-hidden="true" />
              <label htmlFor="admin-q" className="visually-hidden">
                ابحثي باسم المنتج
              </label>
              <input id="admin-q" className="input" type="search" placeholder="ابحثي باسم المنتج…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div className="admin-segment" role="group" aria-label="تصفية حسب الحالة">
              {(['all', 'published', 'hidden'] as Filter[]).map((f) => (
                <button key={f} type="button" className={`chip ${filter === f ? 'chip--active' : ''}`} aria-pressed={filter === f} onClick={() => setFilter(f)}>
                  {f === 'all' ? 'الكل' : f === 'published' ? 'منشور' : 'مخفي'} ({counts[f]})
                </button>
              ))}
            </div>
          </div>

          {shown.length === 0 ? (
            <p className="admin-empty">{items.length ? 'ما أكو منتجات تطابق البحث.' : 'ما أكو منتجات بعد. ابدئي بإضافة أول منتج.'}</p>
          ) : (
            <ul className="admin-list" aria-label="قائمة المنتجات">
              {shown.map((p) => (
                <li key={p.id} className={`admin-item ${p.status === 'hidden' ? 'is-hidden' : ''}`}>
                  <div className="admin-item__media">
                    <ProductImage product={p} sizes="80px" />
                  </div>
                  <div className="admin-item__info">
                    <p className="admin-item__name">
                      <Link to={`/admin/products/${encodeURIComponent(p.id)}`}>{p.name}</Link>
                    </p>
                    <p className="admin-item__meta">
                      {categories[p.category].label}
                      {p.material ? ` · ${materialLabel(p.material)}` : ''}
                      {' · '}
                      <bdi dir="ltr">{p.slug}</bdi>
                    </p>
                    <p className="admin-item__price">
                      <strong>{formatIQD(p.price)}</strong>
                      {p.compareAtPrice ? <s>{formatIQD(p.compareAtPrice)}</s> : null}
                      {p.offer ? <span className="admin-pill">عرض {p.offer.quantity} بـ {formatIQD(p.offer.price)}</span> : null}
                    </p>
                    <p className="admin-item__tags">
                      <span className={`admin-status admin-status--${p.status}`}>{p.status === 'published' ? 'منشور' : 'مخفي'}</span>
                      <span className={`admin-pill ${p.stockQty === 0 ? 'admin-pill--warn' : ''}`}>
                        {p.stockQty === null ? 'الكمية: غير محددة' : p.stockQty === 0 ? 'نفد المخزون' : `الكمية: ${p.stockQty}`}
                      </span>
                    </p>
                  </div>
                  <div className="admin-item__actions">
                    <Link to={`/admin/products/${encodeURIComponent(p.id)}`} className="btn btn--outline btn--sm">
                      <Pencil size={16} aria-hidden="true" /> تعديل
                    </Link>
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => void toggle(p)} disabled={busyId === p.id} aria-label={`${p.status === 'published' ? 'إخفاء' : 'نشر'} ${p.name}`}>
                      {p.status === 'published' ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                      {p.status === 'published' ? 'إخفاء' : 'نشر'}
                    </button>
                    <button type="button" className="btn btn--ghost btn--sm btn--danger" onClick={() => setToDelete(p)} disabled={busyId === p.id} aria-label={`حذف ${p.name}`}>
                      <Trash2 size={16} aria-hidden="true" /> حذف
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {toDelete && (
        <ConfirmDialog
          title="حذف المنتج نهائياً؟"
          confirmLabel="نعم، احذفي نهائياً"
          busy={busyId === toDelete.id}
          onCancel={() => setToDelete(null)}
          onConfirm={() => void confirmDelete()}
        >
          <p>
            راح ينحذف «<strong>{toDelete.name}</strong>» من قاعدة البيانات ومن المتجر، مع صوره المرفوعة. ما يمكن التراجع.
          </p>
          <p className="admin-muted">إذا تريدين إيقافه مؤقتاً، استخدمي «إخفاء» بدل الحذف.</p>
        </ConfirmDialog>
      )}
    </div>
  );
}
