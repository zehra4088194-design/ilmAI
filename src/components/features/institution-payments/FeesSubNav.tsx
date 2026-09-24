import Link from 'next/link';
import { cn } from '@/lib/utils/cn';

const TABS = [
  { key: 'overview', label: 'Overview', href: '' },
  { key: 'collect', label: 'Quick Collection', href: '/collect' },
  { key: 'families', label: 'Family Accounts', href: '/families' },
  { key: 'defaulters', label: 'Defaulters', href: '/defaulters' },
  { key: 'ledger', label: 'Ledger', href: '/ledger' },
] as const;

export function FeesSubNav({ basePath, active }: { basePath: string; active: (typeof TABS)[number]['key'] }) {
  return (
    <nav className="flex flex-wrap gap-2 border-b pb-3">
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={`${basePath}${tab.href}`}
          className={cn(
            'rounded-full px-3 py-1.5 text-sm font-medium transition',
            active === tab.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
