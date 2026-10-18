import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { products } from '../data/products';
import { cartCount, cartSubtotal, clampQty, lineKey } from '../lib/cart-math';
import { readStorage, writeStorage } from '../lib/storage';
import type { CartLine } from '../types';

const STORAGE_KEY = 'sadan.cart.v1';

function isCartLines(v: unknown): v is CartLine[] {
  return (
    Array.isArray(v) &&
    v.every(
      (l) =>
        l && typeof l === 'object' &&
        typeof (l as CartLine).key === 'string' &&
        typeof (l as CartLine).productId === 'string' &&
        typeof (l as CartLine).price === 'number' &&
        typeof (l as CartLine).quantity === 'number',
    )
  );
}

/** يحدّث الأسعار والأسماء المحفوظة حسب الكتالوج الحالي ويحذف المنتجات غير الموجودة أو النافدة */
function syncWithCatalog(saved: CartLine[]): CartLine[] {
  return saved.flatMap((line) => {
    const p = products.find((x) => x.id === line.productId);
    if (!p || !p.inStock) return [];
    return [{ ...line, name: p.name, price: p.price, slug: p.slug, quantity: clampQty(line.quantity) }];
  });
}

export interface AddToCartInput {
  productId: string;
  slug: string;
  name: string;
  price: number;
  color?: string;
  colorHex?: string;
  size?: string;
  quantity: number;
}

interface Toast {
  id: number;
  message: string;
}

interface CartContextValue {
  lines: CartLine[];
  count: number;
  subtotal: number;
  addItem: (item: AddToCartInput) => void;
  setQuantity: (key: string, qty: number) => void;
  removeItem: (key: string) => void;
  clear: () => void;
  toast: Toast | null;
  dismissToast: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(() => syncWithCatalog(readStorage(STORAGE_KEY, [], isCartLines)));
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<number>();

  useEffect(() => writeStorage(STORAGE_KEY, lines), [lines]);

  // مزامنة السلة بين أكثر من تبويب
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setLines(syncWithCatalog(readStorage(STORAGE_KEY, [], isCartLines)));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const showToast = useCallback((message: string) => {
    window.clearTimeout(timer.current);
    setToast({ id: Date.now(), message });
    timer.current = window.setTimeout(() => setToast(null), 3200);
  }, []);

  const addItem = useCallback(
    (item: AddToCartInput) => {
      const key = lineKey(item.productId, item.color, item.size);
      setLines((prev) => {
        const existing = prev.find((l) => l.key === key);
        if (existing) {
          return prev.map((l) => (l.key === key ? { ...l, quantity: clampQty(l.quantity + item.quantity) } : l));
        }
        return [...prev, { ...item, key, quantity: clampQty(item.quantity) }];
      });
      showToast(`تمت إضافة «${item.name}» إلى السلة`);
    },
    [showToast],
  );

  const setQuantity = useCallback((key: string, qty: number) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, quantity: clampQty(qty) } : l)));
  }, []);

  const removeItem = useCallback((key: string) => {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }, []);

  const clear = useCallback(() => setLines([]), []);
  const dismissToast = useCallback(() => setToast(null), []);

  const value = useMemo(
    () => ({
      lines,
      count: cartCount(lines),
      subtotal: cartSubtotal(lines),
      addItem,
      setQuantity,
      removeItem,
      clear,
      toast,
      dismissToast,
    }),
    [lines, addItem, setQuantity, removeItem, clear, toast, dismissToast],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}
