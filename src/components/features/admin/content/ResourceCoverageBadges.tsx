// Shared by the Class Library and University Hub admin overviews (both content
// systems mirror each other's shape exactly — see each module's queries.ts header).
// Renders one small pill per resource type showing how many of that type exist for
// a subject, so a gap (e.g. "0 video lectures") is visible without opening the
// subject page, plus a pill for the MCQ bank size.

type ResourceTypeDef = { key: string; label: string };

export function ResourceCoverageBadges({
  resourceTypes,
  resourceCounts,
  questionCount,
}: {
  resourceTypes: readonly ResourceTypeDef[];
  resourceCounts: Partial<Record<string, number>> | undefined;
  questionCount: number | undefined;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {resourceTypes.map((type) => {
        const count = resourceCounts?.[type.key] || 0;
        return (
          <span
            key={type.key}
            title={type.label}
            className={
              count > 0
                ? 'bg-primary/10 text-primary rounded-full px-1.5 py-0.5 text-[10px] font-medium'
                : 'bg-muted text-muted-foreground/60 rounded-full px-1.5 py-0.5 text-[10px] font-medium'
            }
          >
            {type.label}: {count}
          </span>
        );
      })}
      <span
        title="MCQ bank"
        className={
          (questionCount || 0) > 0
            ? 'rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400'
            : 'bg-muted text-muted-foreground/60 rounded-full px-1.5 py-0.5 text-[10px] font-medium'
        }
      >
        MCQs: {questionCount || 0}
      </span>
    </div>
  );
}
