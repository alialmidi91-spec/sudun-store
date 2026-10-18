/**
 * Sandbox-only, hash-based stand-in for react-router-dom (subset used by SADAN).
 * The real project uses the official react-router-dom package; this exists only so
 * the app can be bundled and browser-tested in an offline environment.
 */
import {
  Children, createContext, isValidElement, useCallback, useContext, useEffect, useMemo, useState,
  type MouseEvent, type ReactElement, type ReactNode,
} from 'react';

interface Loc { pathname: string; search: string; hash: string; state: unknown; key: string }
interface NavOpts { replace?: boolean; state?: unknown }
const RouterCtx = createContext<{ location: Loc; navigate: (to: string, o?: NavOpts) => void } | null>(null);
const RouteCtx = createContext<{ params: Record<string, string>; outlet: ReactNode }>({ params: {}, outlet: null });

declare const __MEMORY_ROUTER__: boolean;
const MEMORY = typeof __MEMORY_ROUTER__ !== 'undefined' && __MEMORY_ROUTER__;
let memPath = '/';
let memState: unknown = null;
function parse(): Loc {
  if (MEMORY) {
    const u = new URL(memPath, 'http://x');
    return { pathname: u.pathname, search: u.search, hash: '', state: memState, key: String(Math.random()) };
  }
  const raw = window.location.hash.startsWith('#/') ? window.location.hash.slice(1) : '/';
  const u = new URL(raw, 'http://x');
  return { pathname: u.pathname, search: u.search, hash: '', state: (history.state && history.state.usr) ?? null, key: String(Math.random()) };
}

export function BrowserRouter({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<Loc>(parse);
  useEffect(() => {
    if (MEMORY) return;
    let last = window.location.hash.startsWith('#/') ? window.location.hash : '#/';
    const onChange = () => {
      if (!window.location.hash.startsWith('#/')) {
        // in-page anchors like #main — keep the route
        history.replaceState(history.state, '', last);
        return;
      }
      last = window.location.hash;
      setLocation(parse());
    };
    window.addEventListener('hashchange', onChange);
    window.addEventListener('popstate', onChange);
    return () => { window.removeEventListener('hashchange', onChange); window.removeEventListener('popstate', onChange); };
  }, []);
  const navigate = useCallback((to: string, o: NavOpts = {}) => {
    const target = to.startsWith('/') ? to : new URL(to, 'http://x' + parse().pathname).pathname;
    const url = '#' + target;
    if (MEMORY) { memPath = target; memState = o.state ?? null; setLocation(parse()); return; }
    if (o.replace) history.replaceState({ usr: o.state }, '', url);
    else history.pushState({ usr: o.state }, '', url);
    setLocation(parse());
  }, []);
  return <RouterCtx.Provider value={{ location, navigate }}>{children}</RouterCtx.Provider>;
}

function useRouter() {
  const c = useContext(RouterCtx);
  if (!c) throw new Error('outside router');
  return c;
}
export const useLocation = () => useRouter().location;
export const useNavigate = () => useRouter().navigate;
export const useParams = <T extends Record<string, string>>() => useContext(RouteCtx).params as Partial<T>;
export const Outlet = () => <>{useContext(RouteCtx).outlet}</>;

export function useSearchParams(): [URLSearchParams, (n: URLSearchParams | Record<string, string>, o?: NavOpts) => void] {
  const { location, navigate } = useRouter();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const set = useCallback(
    (n: URLSearchParams | Record<string, string>, o?: NavOpts) => {
      const s = new URLSearchParams(n as Record<string, string>).toString();
      navigate(location.pathname + (s ? '?' + s : ''), o);
    },
    [location.pathname, navigate],
  );
  return [params, set];
}

interface RouteProps { path?: string; index?: boolean; element?: ReactNode; children?: ReactNode }
export function Route(_: RouteProps): null { return null; }

function match(pattern: string, segs: string[]): Record<string, string> | null {
  const p = pattern.split('/').filter(Boolean);
  if (p[0] === '*') return {};
  if (p.length !== segs.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(':')) params[p[i].slice(1)] = decodeURIComponent(segs[i]);
    else if (p[i] !== segs[i]) return null;
  }
  return params;
}

export function Routes({ children }: { children: ReactNode }) {
  const { location } = useRouter();
  const segs = location.pathname.split('/').filter(Boolean);
  const resolve = (nodes: ReactNode): ReactNode => {
    for (const el of Children.toArray(nodes) as ReactElement<RouteProps>[]) {
      if (!isValidElement(el)) continue;
      const { path, index, element, children: kids } = el.props;
      if (!path && !index && kids) {
        const inner = resolve(kids);
        if (inner !== null) return <RouteCtx.Provider value={{ params: {}, outlet: inner }}>{element}</RouteCtx.Provider>;
        continue;
      }
      if (index && segs.length === 0) return element;
      if (path) {
        const params = match(path, segs);
        if (params) return <RouteCtx.Provider value={{ params, outlet: null }}>{element}</RouteCtx.Provider>;
      }
    }
    return null;
  };
  return <>{resolve(children)}</>;
}

interface LinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'className'> { to: string; end?: boolean; className?: string; replace?: boolean; state?: unknown }
export function Link({ to, onClick, replace, state, ...rest }: LinkProps) {
  const navigate = useNavigate();
  return (
    <a
      {...rest}
      href={'#' + to}
      onClick={(e: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(e);
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.button !== 0) return;
        e.preventDefault();
        navigate(to, { replace, state });
      }}
    />
  );
}
export function NavLink({ to, end, className, ...rest }: LinkProps) {
  const { location } = useRouter();
  const path = to.split('?')[0];
  const active = end ? location.pathname === path : location.pathname === path || location.pathname.startsWith(path + '/');
  return <Link to={to} {...rest} className={[className, active ? 'active' : ''].filter(Boolean).join(' ')} aria-current={active ? 'page' : undefined} />;
}
