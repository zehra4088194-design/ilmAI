type StoreStudyResourceCandidate = {
  resource_type?: string | null;
  title?: string | null;
  grade_level?: string | null;
  subjects?: unknown;
  light_file_url?: string | null;
  dark_file_url?: string | null;
  drive_url?: string | null;
};

const SUPPORTED_GRADES = new Set(["GRADE_9", "GRADE_10", "GRADE_11", "GRADE_12"]);

function firstRelation(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) return (value[0] as Record<string, unknown> | undefined) ?? null;
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

export function isStorePurchasableStudyResource(resource: StoreStudyResourceCandidate): boolean {
  const subject = firstRelation(resource.subjects);
  return Boolean(
    resource.resource_type === "notes"
    && resource.title?.trim()
    && SUPPORTED_GRADES.has(resource.grade_level ?? "")
    && subject?.name
    && subject?.slug
    && (resource.light_file_url || resource.dark_file_url || resource.drive_url),
  );
}

export function getStoreStudyNotePath(resourceId: string): string {
  if (!/^[0-9a-f-]{36}$/i.test(resourceId)) throw new Error("Invalid study resource id.");
  return `/store/ilm-ai-notes/resource/${encodeURIComponent(resourceId)}`;
}
