import { useId } from 'react';

/**
 * رسم توضيحي لقماش منسدل بلون المنتج.
 * يُستخدم فقط عندما لا تتوفر صورة حقيقية للمنتج، ويختفي تلقائياً بمجرد إضافة صور.
 */

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** amount موجب = أفتح، سالب = أغمق */
function shade(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const mix = (c: number) =>
    Math.round(amount >= 0 ? c + (255 - c) * amount : c * (1 + amount));
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

interface Props {
  color: string;
  seed?: string;
  /** نسبة العرض للارتفاع — portrait للبطاقات، wide للـ Hero */
  shape?: 'portrait' | 'wide' | 'square';
  sheen?: boolean;
  className?: string;
  title?: string;
}

export function FabricArt({ color, seed = 'sadan', shape = 'portrait', sheen = false, className, title }: Props) {
  const uid = useId().replace(/:/g, '');
  const rand = seeded(seed + color);
  const W = shape === 'wide' ? 800 : 400;
  const H = shape === 'square' ? 400 : 500;
  const top = H * 0.06;
  const bottom = H * 0.98;

  // خلفية دافئة حسب درجة لون القماش
  const [r, g, b] = hexToRgb(color);
  const isDark = 0.299 * r + 0.587 * g + 0.114 * b < 110;
  const bgA = isDark ? '#EFE8DD' : '#F3EEE6';
  const bgB = isDark ? '#E2D7C6' : '#E9DFD0';

  const folds = shape === 'wide' ? 9 : 5;
  const span = W * 0.78;
  const left = (W - span) / 2;
  const foldPaths = Array.from({ length: folds }, (_, i) => {
    const x = left + (span / folds) * i + rand() * 14;
    const w = span / folds * (0.45 + rand() * 0.35);
    const sway = 18 + rand() * 26;
    const dir = rand() > 0.5 ? 1 : -1;
    return {
      d: `M${x} ${top + 6} C ${x - sway * dir} ${H * 0.35}, ${x + sway * dir} ${H * 0.65}, ${x - sway * 0.4 * dir} ${bottom}
          L ${x + w - sway * 0.4 * dir} ${bottom} C ${x + w + sway * dir} ${H * 0.65}, ${x + w - sway * dir} ${H * 0.35}, ${x + w} ${top + 6} Z`,
      opacity: 0.35 + rand() * 0.4,
    };
  });

  const bodyPath = `M ${left} ${top}
    C ${W * 0.36} ${top - 14}, ${W * 0.64} ${top - 14}, ${W - left} ${top}
    C ${W - left + 18} ${H * 0.4}, ${W - left - 10} ${H * 0.7}, ${W - left + 12} ${bottom}
    Q ${W / 2} ${bottom + 10} ${left - 12} ${bottom}
    C ${left + 10} ${H * 0.7}, ${left - 18} ${H * 0.4}, ${left} ${top} Z`;

  return (
    <svg
      className={className}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={`bg${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={bgA} />
          <stop offset="1" stopColor={bgB} />
        </linearGradient>
        <linearGradient id={`body${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={shade(color, -0.22)} />
          <stop offset="0.35" stopColor={shade(color, 0.08)} />
          <stop offset="0.7" stopColor={color} />
          <stop offset="1" stopColor={shade(color, -0.28)} />
        </linearGradient>
        <linearGradient id={`fold${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={shade(color, -0.35)} stopOpacity="0" />
          <stop offset="0.45" stopColor={shade(color, -0.3)} stopOpacity="0.9" />
          <stop offset="0.6" stopColor={shade(color, 0.25)} stopOpacity="0.8" />
          <stop offset="1" stopColor={shade(color, 0.3)} stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`light${uid}`} cx="0.3" cy="0.15" r="0.75">
          <stop offset="0" stopColor="#fff" stopOpacity={sheen ? 0.45 : 0.28} />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <filter id={`tex${uid}`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={Math.round(rand() * 99)} />
          <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.06 0" />
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
      </defs>
      <rect width={W} height={H} fill={`url(#bg${uid})`} />
      <ellipse cx={W / 2} cy={bottom + 4} rx={span * 0.55} ry={H * 0.035} fill="#49372E" opacity="0.12" />
      <path d={bodyPath} fill={`url(#body${uid})`} />
      {foldPaths.map((f, i) => (
        <path key={i} d={f.d} fill={`url(#fold${uid})`} opacity={f.opacity} />
      ))}
      <path d={bodyPath} fill={`url(#light${uid})`} />
      <path d={bodyPath} fill="#000" filter={`url(#tex${uid})`} />
      <path
        d={`M ${left} ${top} C ${W * 0.36} ${top - 14}, ${W * 0.64} ${top - 14}, ${W - left} ${top}`}
        stroke={shade(color, -0.4)}
        strokeOpacity="0.35"
        strokeWidth="2"
        fill="none"
      />
    </svg>
  );
}
