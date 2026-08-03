import type { MetadataRoute } from 'next';
import { BLOG_POSTS } from '@/content/blog-posts';
import { getSiteUrl } from '@/lib/utils/siteUrl';

const STATIC_ROUTES = [
  { path: '', priority: 1, changeFrequency: 'weekly' as const },
  { path: '/features/notes', priority: 0.95, changeFrequency: 'monthly' as const },
  { path: '/features/lectures', priority: 0.95, changeFrequency: 'monthly' as const },
  { path: '/features/ai-tutor', priority: 0.95, changeFrequency: 'monthly' as const },
  { path: '/features/presentation-builder', priority: 0.95, changeFrequency: 'monthly' as const },
  { path: '/about', priority: 0.8, changeFrequency: 'monthly' as const },
  { path: '/pricing', priority: 0.5, changeFrequency: 'monthly' as const },
  { path: '/blog', priority: 0.6, changeFrequency: 'weekly' as const },
  { path: '/library', priority: 0.95, changeFrequency: 'weekly' as const },
  { path: '/past-papers', priority: 0.9, changeFrequency: 'weekly' as const },
  { path: '/colleges', priority: 0.6, changeFrequency: 'weekly' as const },
  { path: '/demo', priority: 0.6, changeFrequency: 'monthly' as const },
  { path: '/contact', priority: 0.4, changeFrequency: 'yearly' as const },
  { path: '/help', priority: 0.6, changeFrequency: 'monthly' as const },
  { path: '/privacy', priority: 0.4, changeFrequency: 'yearly' as const },
  { path: '/terms', priority: 0.4, changeFrequency: 'yearly' as const },
  { path: '/cookies', priority: 0.4, changeFrequency: 'yearly' as const },
  { path: '/refund-policy', priority: 0.4, changeFrequency: 'yearly' as const },
  { path: '/status', priority: 0.5, changeFrequency: 'daily' as const },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getSiteUrl();
  const staticLastModified = new Date('2026-08-02T00:00:00Z');

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${baseUrl}${route.path}`,
    lastModified: staticLastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const articleEntries: MetadataRoute.Sitemap = BLOG_POSTS.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(`${post.updatedAt}T00:00:00Z`),
    changeFrequency: 'monthly',
    priority: 0.8,
  }));

  return [...staticEntries, ...articleEntries];
}
