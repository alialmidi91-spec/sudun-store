import { useEffect } from 'react';

/** Adds a subtle reveal to homepage product cards as they enter the viewport. */
export function ProductRevealObserver() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const items = document.querySelectorAll<HTMLElement>('.section--tight .grid > *');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    items.forEach((item) => {
      item.classList.add('sudun-reveal');
      observer.observe(item);
    });
    return () => observer.disconnect();
  }, []);

  return null;
}
