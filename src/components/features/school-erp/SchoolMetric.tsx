import type { LucideIcon } from 'lucide-react';

export function SchoolMetric({
  label,
  value,
  icon: Icon,
  tone = 'text-emerald-600 bg-emerald-500/10',
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: string;
}) {
  return (
    <div className="border-border bg-card flex min-w-0 items-center gap-3 rounded-lg border p-4">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tone}`}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-2xl font-bold">{value}</span>
        <span className="text-muted-foreground block truncate text-xs">{label}</span>
      </span>
    </div>
  );
}
