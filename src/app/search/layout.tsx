import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Search | ilm AI',
  description: 'Search the ilm AI study catalog and your available learning resources.',
  robots: { index: false, follow: true },
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
