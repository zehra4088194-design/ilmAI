export type ClassOverviewRow = { id: string; className: string; studentCount: number };

export function ClassOverviewList({ classes }: { classes: ClassOverviewRow[] }) {
  if (!classes.length) {
    return <p className="text-muted-foreground text-sm">No active classes yet.</p>;
  }

  const max = Math.max(...classes.map((row) => row.studentCount), 1);

  return (
    <div className="space-y-2.5">
      {classes.map((row) => (
        <div key={row.id} className="flex items-center gap-3">
          <span className="w-28 shrink-0 truncate text-sm font-medium">{row.className}</span>
          <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
            <div
              className="h-full rounded-full bg-sky-500"
              style={{ width: `${Math.max(6, Math.round((row.studentCount / max) * 100))}%` }}
            />
          </div>
          <span className="text-muted-foreground w-8 shrink-0 text-right text-xs">{row.studentCount}</span>
        </div>
      ))}
    </div>
  );
}
