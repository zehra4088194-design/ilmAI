import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/utils/siteUrl';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getSiteUrl();
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/admin/', '/dashboard/', '/settings/'] }],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
