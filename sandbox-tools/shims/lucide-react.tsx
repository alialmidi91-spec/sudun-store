// Sandbox-only stand-in for lucide-react (the real package is used in the actual project).
import { createElement } from 'react';
type P = { size?: number; className?: string; 'aria-hidden'?: boolean | 'true' };
const mk = (paths: string[], circles: [number, number, number][] = []) =>
  ({ size = 24, ...rest }: P) =>
    createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round', ...rest },
      ...paths.map((d, i) => createElement('path', { key: 'p' + i, d })),
      ...circles.map(([cx, cy, r], i) => createElement('circle', { key: 'c' + i, cx, cy, r })));
export const Search = mk(['m21 21-4.3-4.3'], [[11, 11, 8]]);
export const SearchX = mk(['m21 21-4.3-4.3', 'm13.5 8.5-5 5', 'm8.5 8.5 5 5'], [[11, 11, 8]]);
export const ShoppingBag = mk(['M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z', 'M3 6h18', 'M16 10a4 4 0 0 1-8 0']);
export const Menu = mk(['M4 12h16', 'M4 6h16', 'M4 18h16']);
export const X = mk(['M18 6 6 18', 'm6 6 12 12']);
export const Minus = mk(['M5 12h14']);
export const Plus = mk(['M5 12h14', 'M12 5v14']);
export const ChevronDown = mk(['m6 9 6 6 6-6']);
export const ChevronLeft = mk(['m15 18-6-6 6-6']);
export const ArrowLeft = mk(['m12 19-7-7 7-7', 'M19 12H5']);
export const Check = mk(['M20 6 9 17l-5-5']);
export const CheckCircle2 = mk(['m9 12 2 2 4-4'], [[12, 12, 10]]);
export const AlertCircle = mk(['M12 8v4', 'M12 16h.01'], [[12, 12, 10]]);
export const AlertTriangle = mk(['m21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3Z', 'M12 9v4', 'M12 17h.01']);
export const Trash2 = mk(['M3 6h18', 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6', 'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2']);
export const Truck = mk(['M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2', 'M15 18H9', 'M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14'], [[17, 18, 2], [7, 18, 2]]);
export const Mail = mk(['m22 7-10 6L2 7', 'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z']);
export const MessageCircle = mk(['M7.9 20A9 9 0 1 0 4 16.1L2 22Z']);
export const Banknote = mk(['M2 6h20v12H2z', 'M6 12h.01M18 12h.01'], [[12, 12, 2]]);
export const PackageCheck = mk(['m16 16 2 2 4-4', 'M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14', 'M3.3 7 12 12l8.7-5', 'M12 22V12']);
export const RefreshCw = mk(['M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8', 'M21 3v5h-5', 'M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16', 'M8 16H3v5']);
export const SlidersHorizontal = mk(['M21 4h-7', 'M10 4H3', 'M21 12h-9', 'M8 12H3', 'M21 20h-5', 'M12 20H3', 'M14 2v4', 'M8 10v4', 'M16 18v4']);
export const MapPin = mk(['M20 10c0 4.99-5.54 10.19-7.4 11.8a1 1 0 0 1-1.2 0C9.54 20.19 4 14.99 4 10a8 8 0 0 1 16 0'], [[12, 10, 3]]);
export const Home = mk(['M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8', 'M3 10a2 2 0 0 1 .71-1.53l7-6a2 2 0 0 1 2.58 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z']);
export const LayoutGrid = mk(['M3 3h7v7H3z', 'M14 3h7v7h-7z', 'M14 14h7v7h-7z', 'M3 14h7v7H3z']);
export const Tag = mk(['M12.59 2.59A2 2 0 0 0 11.17 2H4a2 2 0 0 0-2 2v7.17a2 2 0 0 0 .59 1.42l8.7 8.7a2.43 2.43 0 0 0 3.42 0l6.58-6.58a2.43 2.43 0 0 0 0-3.42z'], [[7.5, 7.5, 0.5]]);
// لوحة التحكم
export const Pencil = mk(['M21.17 6.81a1 1 0 0 0-3.99-3.99L3.84 16.17a2 2 0 0 0-.5.83l-1.32 4.35a.5.5 0 0 0 .62.62l4.35-1.32a2 2 0 0 0 .83-.5z', 'm15 5 4 4']);
export const Eye = mk(['M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0'], [[12, 12, 3]]);
export const EyeOff = mk(['M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68', 'M6.61 6.61A13.53 13.53 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61', 'M14.12 14.12a3 3 0 1 1-4.24-4.24', 'm2 2 20 20']);
export const LogOut = mk(['m16 17 5-5-5-5', 'M21 12H9', 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4']);
export const ArrowUp = mk(['m5 12 7-7 7 7', 'M12 19V5']);
export const ArrowDown = mk(['M12 5v14', 'm19 12-7 7-7-7']);
export const ImagePlus = mk(['M16 5h6', 'M19 2v6', 'M21 11.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7.5', 'm21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21'], [[9, 9, 2]]);
export const ExternalLink = mk(['M15 3h6v6', 'M10 14 21 3', 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6']);
export const Package = mk(['M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z', 'M12 22V12', 'm3.3 7 8.7 5 8.7-5']);
