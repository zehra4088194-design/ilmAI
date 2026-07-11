export function RoadmapTimeline({ items }: { items: any[] }) {
  if (!items?.length) return <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Roadmap will appear after generation.</p>;
  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={index} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{index + 1}</span>
            {index < items.length - 1 && <span className="h-full w-px bg-border" />}
          </div>
          <div className="pb-5">
            <p className="font-semibold">{item.stage || item.title || `Stage ${index + 1}`}</p>
            <p className="text-sm text-muted-foreground">{item.action || item.description || item.summary}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
