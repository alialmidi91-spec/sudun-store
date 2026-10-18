import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { siteConfig } from '../config/site';

interface SeoOptions {
  title?: string;
  description?: string;
  image?: string;
  noindex?: boolean;
}

function setMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.rel = 'canonical';
    document.head.appendChild(el);
  }
  el.href = href;
}

/** يضبط عنوان الصفحة ووصفها وبيانات Open Graph لكل صفحة */
export function useSeo({ title, description, image, noindex }: SeoOptions) {
  const { pathname } = useLocation();

  useEffect(() => {
    const brand = `${siteConfig.nameAr} | ${siteConfig.nameEn}`;
    const fullTitle = title ? `${title} — ${brand}` : `${brand} — ${siteConfig.tagline}`;
    const desc = description ?? siteConfig.description;
    const url = `${siteConfig.siteUrl}${pathname}`;
    const img = `${siteConfig.siteUrl}${image ?? '/og-image.jpg'}`;

    document.title = fullTitle;
    setMeta('name', 'description', desc);
    setMeta('property', 'og:title', fullTitle);
    setMeta('property', 'og:description', desc);
    setMeta('property', 'og:url', url);
    setMeta('property', 'og:image', img);
    setMeta('name', 'robots', noindex ? 'noindex, follow' : 'index, follow');
    setCanonical(url);
  }, [title, description, image, noindex, pathname]);
}
