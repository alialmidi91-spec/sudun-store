import { useEffect, useId, useRef, type ReactNode } from 'react';

/** نافذة تأكيد متاحة باللوحة (Escape للإلغاء، التركيز يبقى داخلها، والتركيز الأول على «إلغاء» للأمان) */
export function ConfirmDialog({
  title,
  children,
  confirmLabel,
  busy = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const bodyId = useId();
  // نخزن آخر قيم حتى ما يُعاد ربط الأحداث (ويرجع التركيز لـ «إلغاء») بكل إعادة رسم
  const latest = useRef({ busy, onCancel });
  latest.current = { busy, onCancel };

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    document.body.classList.add('no-scroll');
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !latest.current.busy) latest.current.onCancel();
      if (e.key === 'Tab' && ref.current) {
        const f = ref.current.querySelectorAll<HTMLElement>('button:not(:disabled)');
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('no-scroll');
      prev?.focus?.();
    };
  }, []);

  return (
    <div className="overlay admin-overlay" onMouseDown={(e) => e.target === e.currentTarget && !busy && onCancel()}>
      <div ref={ref} className="admin-dialog" role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={bodyId}>
        <h2 id={titleId} className="admin-dialog__title">
          {title}
        </h2>
        <div id={bodyId} className="admin-dialog__body">
          {children}
        </div>
        <div className="admin-dialog__actions">
          <button ref={cancelRef} type="button" className="btn btn--outline" onClick={onCancel} disabled={busy}>
            إلغاء
          </button>
          <button type="button" className="btn btn--danger-solid" onClick={onConfirm} disabled={busy}>
            {busy ? 'جارٍ التنفيذ…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
