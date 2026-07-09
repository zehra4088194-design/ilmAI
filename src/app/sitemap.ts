import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/utils/siteUrl';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getSiteUrl();
  const routes = ['', '/about', '/pricing', '/blog', '/contact', '/login', '/register'];
  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '' ? 'daily' : 'weekly',
    priority: route === '' ? 1 : 0.8,
  }));
}
