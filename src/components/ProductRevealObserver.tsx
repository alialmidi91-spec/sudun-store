import { useEffect } from 'react';

/** Reveals homepage product cards, including cards rendered after async catalog loading. */
export function ProductRevealObserver() {
  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reduceMotion.matches || !('IntersectionObserver' in window)) return;

    const section = document.querySelector('.section--tight');
    if (!section) return;

    let revealObserver: IntersectionObserver | undefined;
    let index = 0;

    const observeCards = () => {
      const cards = section.querySelectorAll<HTMLElement>('.grid > .card:not([data-sudun-motion])');
      cards.forEach((card) => {
        card.dataset.sudunMotion = 'true';
        card.classList.add('sudun-reveal');
        card.style.setProperty('--reveal-index', String(index++));
        revealObserver?.observe(card);
      });
    };

    revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const card = entry.target as HTMLElement;
        card.classList.add('is-visible');
        revealObserver?.unobserve(card);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -4% 0px' });

    // ProductGrid is populated asynchronously, so watch for cards added after mount.
    observeCards();
    const mutationObserver = new MutationObserver(observeCards);
    mutationObserver.observe(section, { childList: true, subtree: true });

    return () => {
      mutationObserver.disconnect();
      revealObserver?.disconnect();
    };
  }, []);

  return null;
}
