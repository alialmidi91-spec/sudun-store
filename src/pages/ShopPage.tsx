import { SearchX, SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ProductGrid, ProductGridSkeleton } from '../components/ProductCard';
import { DemoNotice, EmptyState, ErrorState, PageHeader } from '../components/ui';
import { categories, colorFamilies, materials, priceRanges, type PriceRangeId } from '../data/taxonomy';
import { useAsync } from '../hooks/useAsync';
import { useSeo } from '../hooks/useSeo';
import { applyFilters, fetchProducts, sortOptions, type CatalogFilters, type SortId } from '../lib/catalog';
import type { CategoryId, ColorFamily, MaterialId } from '../types';

function readList<T extends string>(params: URLSearchParams, key: string, allowed: readonly string[]): T[] {
  return (params.get(key) ?? '')
    .split(',')
    .filter((v) => allowed.includes(v)) as T[];
}

function useCatalogParams() {
  const [params, setParams] = useSearchParams();

  const filters: CatalogFilters & { onlyNew: boolean; onlyBest: boolean; onlyOffers: boolean } = {
    q: params.get('q') ?? '',
    categories: readList<CategoryId>(params, 'category', Object.keys(categories)),
    materials: readList<MaterialId>(params, 'material', Object.keys(materials)),
    colors: readList<ColorFamily>(params, 'color', Object.keys(colorFamilies)),
    price: (priceRanges.some((r) => r.id === params.get('price')) ? params.get('price') : '') as PriceRangeId | '',
    inStockOnly: params.get('stock') === '1',
    sort: (sortOptions.some((s) => s.id === params.get('sort')) ? params.get('sort') : 'newest') as SortId,
    onlyNew: params.get('new') === '1',
    onlyBest: params.get('best') === '1',
    onlyOffers: params.get('offers') === '1',
  };

  const update = (patch: Record<string, string | string[] | null>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => {
      const value = Array.isArray(v) ? v.join(',') : v;
      if (value) next.set(k, value);
      else next.delete(k);
    });
    setParams(next, { replace: true });
  };

  const toggle = (key: string, list: string[], value: string) =>
    update({ [key]: list.includes(value) ? list.filter((x) => x !== value) : [...list, value] });

  const reset = () => setParams(filters.q ? { q: filters.q } : {}, { replace: true });
  const clearAll = () => setParams({}, { replace: true });

  return { filters, update, toggle, reset, clearAll };
}

export default function ShopPage() {
  const { filters, update, toggle, reset, clearAll } = useCatalogParams();
  const { state, retry } = useAsync(fetchProducts);
  const [panelOpen, setPanelOpen] = useState(false);
  const [query, setQuery] = useState(filters.q);

  // مزامنة حقل البحث مع الرابط (مع تأخير بسيط أثناء الكتابة)
  useEffect(() => setQuery(filters.q), [filters.q]);
  useEffect(() => {
    if (query === filters.q) return;
    const t = window.setTimeout(() => update({ q: query.trim() || null }), 250);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useEffect(() => {
    document.body.classList.toggle('no-scroll', panelOpen);
    if (!panelOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setPanelOpen(false);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('no-scroll');
    };
  }, [panelOpen]);

  const title = filters.onlyOffers ? 'العروض' : filters.onlyNew ? 'وصل حديثاً' : filters.onlyBest ? 'الأكثر مبيعاً' : 'كل الحجابات';
  useSeo({ title, description: 'تصفّحي حجابات سُدَن حسب النوع واللون والخامة والسعر، واطلبي عبر واتساب.' });

  const results = useMemo(() => {
    if (state.status !== 'success') return [];
    let base = state.data;
    if (filters.onlyNew) base = base.filter((p) => p.isNew);
    if (filters.onlyBest) base = base.filter((p) => p.isBestSeller);
    if (filters.onlyOffers) base = base.filter((p) => p.offer);
    return applyFilters(base, filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, JSON.stringify(filters)]);

  const activeCount =
    filters.categories.length + filters.materials.length + filters.colors.length +
    (filters.price ? 1 : 0) + (filters.inStockOnly ? 1 : 0) + (filters.onlyNew ? 1 : 0) + (filters.onlyBest ? 1 : 0) + (filters.onlyOffers ? 1 : 0);

  const panel = (
    <div className="filters">
      <fieldset className="filters__group">
        <legend>نوع الحجاب</legend>
        {(Object.keys(categories) as CategoryId[]).map((id) => (
          <label key={id} className="check">
            <input type="checkbox" checked={filters.categories.includes(id)} onChange={() => toggle('category', filters.categories, id)} />
            <span>{categories[id].label}</span>
          </label>
        ))}
      </fieldset>

      <fieldset className="filters__group">
        <legend>اللون</legend>
        <div className="filters__swatches">
          {(Object.keys(colorFamilies) as ColorFamily[]).map((id) => (
            <label key={id} className="swatch-check" title={colorFamilies[id].label}>
              <input type="checkbox" checked={filters.colors.includes(id)} onChange={() => toggle('color', filters.colors, id)} />
              <span className="swatch-dot swatch-dot--lg" style={{ background: colorFamilies[id].swatch }} aria-hidden="true" />
              <span className="swatch-check__label">{colorFamilies[id].label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="filters__group">
        <legend>الخامة</legend>
        {(Object.keys(materials) as MaterialId[]).map((id) => (
          <label key={id} className="check">
            <input type="checkbox" checked={filters.materials.includes(id)} onChange={() => toggle('material', filters.materials, id)} />
            <span>{materials[id].label}</span>
          </label>
        ))}
      </fieldset>

      <fieldset className="filters__group">
        <legend>السعر (د.ع)</legend>
        <label className="check">
          <input type="radio" name="price" checked={!filters.price} onChange={() => update({ price: null })} />
          <span>كل الأسعار</span>
        </label>
        {priceRanges.map((r) => (
          <label key={r.id} className="check">
            <input type="radio" name="price" checked={filters.price === r.id} onChange={() => update({ price: r.id })} />
            <span>{r.label}</span>
          </label>
        ))}
      </fieldset>

      <fieldset className="filters__group">
        <legend>التوفر</legend>
        <label className="check">
          <input type="checkbox" checked={filters.inStockOnly} onChange={() => update({ stock: filters.inStockOnly ? null : '1' })} />
          <span>المتوفر فقط</span>
        </label>
      </fieldset>
    </div>
  );

  return (
    <>
      <PageHeader eyebrow="المتجر" title={title} intro="اختاري حسب النوع واللون والخامة، وكل الأسعار بالدينار العراقي." />
      <div className="container shop">
        <aside className="shop__sidebar hide-mobile" aria-label="تصفية المنتجات">
          <div className="shop__sidebar-head">
            <h2>تصفية</h2>
            {activeCount > 0 && (
              <button type="button" className="btn btn--link" onClick={reset}>
                مسح الكل
              </button>
            )}
          </div>
          {panel}
        </aside>

        <div className="shop__main">
          <div className="toolbar">
            <div className="toolbar__search">
              <label htmlFor="shop-search" className="visually-hidden">
                البحث باسم المنتج
              </label>
              <input
                id="shop-search"
                type="search"
                className="input"
                placeholder="ابحثي باسم الحجاب…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                enterKeyHint="search"
              />
            </div>
            <button type="button" className="btn btn--outline hide-desktop" onClick={() => setPanelOpen(true)}>
              <SlidersHorizontal size={16} aria-hidden="true" /> تصفية{activeCount ? ` (${activeCount})` : ''}
            </button>
            <label className="toolbar__sort">
              <span className="visually-hidden">ترتيب حسب</span>
              <select className="input" value={filters.sort} onChange={(e) => update({ sort: e.target.value === 'newest' ? null : e.target.value })}>
                {sortOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <ul className="quick-cats" aria-label="اختصار حسب النوع">
            <li>
              <button
                type="button"
                className={`chip ${!filters.categories.length && !filters.onlyOffers ? 'chip--active' : ''}`}
                aria-pressed={!filters.categories.length && !filters.onlyOffers}
                onClick={() => update({ category: null, offers: null })}
              >
                الكل
              </button>
            </li>
            <li>
              <button
                type="button"
                className={`chip ${filters.onlyOffers ? 'chip--active' : ''}`}
                aria-pressed={filters.onlyOffers}
                onClick={() => update({ offers: filters.onlyOffers ? null : '1', category: null })}
              >
                العروض
              </button>
            </li>
            {(Object.keys(categories) as CategoryId[]).map((id) => {
              const on = filters.categories.length === 1 && filters.categories[0] === id;
              return (
                <li key={id}>
                  <button type="button" className={`chip ${on ? 'chip--active' : ''}`} aria-pressed={on} onClick={() => update({ category: on ? null : id, offers: null })}>
                    {categories[id].label}
                  </button>
                </li>
              );
            })}
          </ul>

          {(filters.onlyNew || filters.onlyBest) && (
            <div className="active-chips">
              <button type="button" className="chip chip--active" onClick={() => update({ new: null, best: null })}>
                {filters.onlyNew ? 'الجديد فقط' : 'الأكثر مبيعاً فقط'} <X size={14} aria-hidden="true" />
                <span className="visually-hidden">إزالة</span>
              </button>
            </div>
          )}

          <DemoNotice compact />

          {state.status === 'loading' && <ProductGridSkeleton count={6} />}
          {state.status === 'error' && <ErrorState message={state.error.message} onRetry={retry} />}
          {state.status === 'success' && (
            <>
              <p className="results-count" aria-live="polite">
                {results.length ? `${results.length} منتج` : ''}
              </p>
              {results.length ? (
                <ProductGrid products={results} priorityCount={2} />
              ) : (
                <EmptyState
                  icon={<SearchX size={32} aria-hidden="true" />}
                  title="ما لگينا حجابات تطابق اختياراتچ"
                  text={filters.q ? `جرّبي كلمة بحث ثانية بدل «${filters.q}» أو خففي التصفية.` : 'جرّبي تخففين التصفية.'}
                  action={
                    <button
                      type="button"
                      className="btn btn--dark"
                      onClick={() => {
                        setQuery('');
                        clearAll();
                      }}
                    >
                      عرض كل الحجابات
                    </button>
                  }
                />
              )}
            </>
          )}
        </div>
      </div>

      {panelOpen && (
        <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && setPanelOpen(false)}>
          <div className="sheet" role="dialog" aria-modal="true" aria-label="تصفية المنتجات">
            <div className="sheet__head">
              <h2>تصفية</h2>
              <button type="button" className="icon-btn" onClick={() => setPanelOpen(false)} aria-label="إغلاق التصفية" autoFocus>
                <X size={22} />
              </button>
            </div>
            <div className="sheet__body">{panel}</div>
            <div className="sheet__foot">
              <button type="button" className="btn btn--ghost" onClick={reset} disabled={!activeCount}>
                مسح
              </button>
              <button type="button" className="btn btn--dark btn--grow" onClick={() => setPanelOpen(false)}>
                عرض {state.status === 'success' ? results.length : ''} منتج
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
