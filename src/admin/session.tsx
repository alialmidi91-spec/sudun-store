import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { readStorage, writeStorage } from '../lib/storage';
import { refreshSession, restSelect, signInWithPassword, signOut, type AuthSession } from '../lib/supabase-rest';

/**
 * جلسة المدير: تسجيل الدخول عبر Supabase Auth، تجديد الرمز تلقائياً،
 * والتحقق من أن الحساب موجود في جدول admins (الصلاحية الفعلية تفرضها قاعدة البيانات).
 */
const SESSION_KEY = 'sudun.admin.session.v1';

type Status = 'checking' | 'signed-out' | 'not-admin' | 'admin';

interface AdminContextValue {
  status: Status;
  email?: string;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** رمز صالح للطلبات (يتجدد تلقائياً قبل انتهائه) */
  getToken: () => Promise<string>;
}

const AdminContext = createContext<AdminContextValue | null>(null);

const isSession = (v: unknown): v is AuthSession =>
  !!v && typeof v === 'object' && typeof (v as AuthSession).access_token === 'string' && typeof (v as AuthSession).refresh_token === 'string';

async function checkAdmin(session: AuthSession): Promise<boolean> {
  const rows = await restSelect<{ user_id: string }>('admins', `select=user_id&user_id=eq.${encodeURIComponent(session.user.id)}`, session.access_token);
  return rows.length === 1;
}

export function AdminProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => readStorage<AuthSession | null>(SESSION_KEY, null, isSession as (v: unknown) => v is AuthSession | null));
  const [status, setStatus] = useState<Status>(() => (session ? 'checking' : 'signed-out'));
  const sessionRef = useRef(session);
  const refreshing = useRef<Promise<AuthSession> | null>(null);

  const save = useCallback((s: AuthSession | null) => {
    sessionRef.current = s;
    setSession(s);
    if (s) writeStorage(SESSION_KEY, s);
    else {
      try {
        window.localStorage.removeItem(SESSION_KEY);
      } catch {
        /* ignore */
      }
    }
  }, []);

  const getToken = useCallback(async () => {
    const s = sessionRef.current;
    if (!s) throw new Error('انتهت الجلسة. سجّلي الدخول مرة ثانية.');
    if (s.expires_at - 60 > Date.now() / 1000) return s.access_token;
    refreshing.current ??= refreshSession(s.refresh_token).finally(() => {
      refreshing.current = null;
    });
    try {
      const next = await refreshing.current;
      save(next);
      return next.access_token;
    } catch (e) {
      save(null);
      setStatus('signed-out');
      throw e;
    }
  }, [save]);

  // عند فتح اللوحة بجلسة محفوظة: نجدد الرمز ونتأكد إنه مدير
  useEffect(() => {
    if (!session || status !== 'checking') return;
    let active = true;
    (async () => {
      try {
        await getToken();
        const ok = await checkAdmin(sessionRef.current!);
        if (active) setStatus(ok ? 'admin' : 'not-admin');
      } catch {
        if (active) {
          save(null);
          setStatus('signed-out');
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [session, status, getToken, save]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const s = await signInWithPassword(email.trim(), password);
      save(s);
      const ok = await checkAdmin(s);
      setStatus(ok ? 'admin' : 'not-admin');
    },
    [save],
  );

  const doSignOut = useCallback(async () => {
    const s = sessionRef.current;
    save(null);
    setStatus('signed-out');
    if (s) await signOut(s.access_token);
  }, [save]);

  const value = useMemo(
    () => ({ status, email: session?.user.email, signIn, signOut: doSignOut, getToken }),
    [status, session, signIn, doSignOut, getToken],
  );
  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin(): AdminContextValue {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used inside <AdminProvider>');
  return ctx;
}
