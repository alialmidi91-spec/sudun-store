import { useEffect } from 'react';

/** Reveals homepage product cards after they enter the viewport. */
export function ProductRevealObserver() {
  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reduceMotion.matches) return;

    const items = document.querySelectorAll<HTMLElement>('.section--tight .grid > .card');
    if (!items.length) return;

    if (!('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const item = entry.target as HTMLElement;
        item.classList.add('is-visible');
        observer.unobserve(item);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -4% 0px' });

    items.forEach((item, index) => {
      item.classList.add('sudun-reveal');
      item.style.setProperty('--reveal-index', String(index));
      observer.observe(item);
    });

    return () => observer.disconnect();
  }, []);

  return null;
}
