import "server-only";

import { createServiceClient } from "@/lib/supabase/service";
import { countPdfPages } from "@/lib/library/pdfPageCount";
import { getPlatformSettings } from "@/lib/platform-settings/server";
import { computeNotesOrderPriceRs } from "@/lib/platform-settings/shared";
import { generateStudyCoverSvg, resolveContentType } from "@/lib/library/studyCoverSvg";

type Raw = Record<string, any>;

export type StudyNoteCatalogResource = {
  resourceId: string;
  academicLevel: "school" | "college";
  board: string | null;
  gradeLevel: string | null;
  subjectId: string | null;
  subjectName: string;
  subjectSlug: string;
  bookTitle: string;
  chapterId: string | null;
  chapterNumber: number | null;
  chapterName: string | null;
  chapterSlug: string | null;
  contentSection: "reading" | "numericals" | "mcq" | "short" | "long";
  resourceTitle: string;
  resourceDisplayOrder: number;
  pageCount: number | null;
  hasLightVersion: boolean;
  hasDarkVersion: boolean;
  sourceCreatedAt: string | null;
};

function toAcademicLevel(gradeLevel: string | null): "school" | "college" {
  return gradeLevel === "GRADE_9" || gradeLevel === "GRADE_10" ? "school" : "college";
}

function mapCatalogRow(resource: Raw): StudyNoteCatalogResource | null {
  const subject = Array.isArray(resource.subjects) ? resource.subjects[0] : resource.subjects;
  const chapter = Array.isArray(resource.chapters) ? resource.chapters[0] : resource.chapters;
  if (!subject?.name || !subject?.slug || !resource.title) return null;
  if (!resource.light_file_url && !resource.dark_file_url && !resource.drive_url) return null;

  return {
    resourceId: resource.id,
    academicLevel: toAcademicLevel(resource.grade_level ?? null),
    board: resource.board ?? null,
    gradeLevel: resource.grade_level ?? null,
    subjectId: resource.subject_id ?? null,
    subjectName: subject.name,
    subjectSlug: subject.slug,
    bookTitle: resource.book_title || `${subject.name} Notes`,
    chapterId: resource.chapter_id ?? null,
    chapterNumber: chapter?.order_index ?? null,
    chapterName: chapter?.name ?? null,
    chapterSlug: chapter?.slug ?? null,
    contentSection: resource.content_section || "reading",
    resourceTitle: resource.title,
    resourceDisplayOrder: chapter?.order_index ?? 0,
    pageCount: resource.page_count ?? null,
    hasLightVersion: Boolean(resource.light_file_url),
    hasDarkVersion: Boolean(resource.dark_file_url),
    sourceCreatedAt: resource.created_at ?? null,
  };
}

export async function listStudyNoteCatalogResources(offset: number, limit: number) {
  const db = createServiceClient();
  const safeOffset = Math.max(0, offset);
  const safeLimit = Math.min(500, Math.max(1, limit));

  const { data, error, count } = await (db.from("library_resources") as any)
    .select(
      "id,title,book_title,content_section,resource_type,drive_url,light_file_url,dark_file_url,page_count,subject_id,chapter_id,board,grade_level,created_at,subjects(id,name,slug),chapters(id,name,slug,order_index)",
      { count: "exact" },
    )
    .eq("resource_type", "notes")
    .not("subject_id", "is", null)
    .order("grade_level")
    .order("subject_id")
    .order("chapter_id")
    .order("content_section")
    .order("title")
    .range(safeOffset, safeOffset + safeLimit - 1);

  if (error) throw new Error(error.message);

  const items = (data ?? [])
    .map(mapCatalogRow)
    .filter(Boolean) as StudyNoteCatalogResource[];

  const total = count ?? items.length;
  const nextOffset = safeOffset + items.length < total ? safeOffset + items.length : null;
  return { items, nextOffset, total };
}

export async function getStudyNoteCatalogResource(resourceId: string): Promise<StudyNoteCatalogResource | null> {
  const db = createServiceClient();
  const { data, error } = await (db.from("library_resources") as any)
    .select(
      "id,title,book_title,content_section,resource_type,drive_url,light_file_url,dark_file_url,page_count,subject_id,chapter_id,board,grade_level,created_at,subjects(id,name,slug),chapters(id,name,slug,order_index)",
    )
    .eq("id", resourceId)
    .eq("resource_type", "notes")
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapCatalogRow(data) : null;
}

export async function resolvePrintableStudyNote(resourceId: string) {
  const db = createServiceClient();
  const resource = await getStudyNoteCatalogResource(resourceId);
  if (!resource) throw new Error("This study note could not be found or is not printable.");

  let pageCount = resource.pageCount;
  if (!pageCount) {
    const { data: raw } = await (db.from("library_resources") as any)
      .select("page_count,light_file_url,dark_file_url,drive_url")
      .eq("id", resourceId)
      .maybeSingle();
    pageCount = raw?.page_count ?? null;
    if (!pageCount) {
      for (const url of [raw?.light_file_url, raw?.dark_file_url, raw?.drive_url].filter(Boolean) as string[]) {
        pageCount = await countPdfPages(url);
        if (pageCount) break;
      }
    }
    if (!pageCount) throw new Error("Could not read this file to count its pages yet.");
    await (db.from("library_resources") as any).update({ page_count: pageCount }).eq("id", resourceId);
  }

  const settings = await getPlatformSettings();
  const priceRs = pageCount
    ? await Promise.resolve(
        (await (db.from("library_resources") as any).select("resource_type").eq("id", resourceId).maybeSingle()).data?.resource_type === "text_book"
          ? 599
          : computeNotesOrderPriceRs(settings, pageCount),
      )
    : computeNotesOrderPriceRs(settings, 1);

  const rawResource = await (db.from("library_resources") as any)
    .select("title,grade_level,content_section,resource_type,subjects(name),chapters(name,order_index)")
    .eq("id", resourceId)
    .maybeSingle();
  const subject = Array.isArray(rawResource?.subjects) ? rawResource.subjects[0] : rawResource?.subjects;
  const chapter = Array.isArray(rawResource?.chapters) ? rawResource.chapters[0] : rawResource?.chapters;

  const coverSvg = generateStudyCoverSvg({
    className: rawResource?.grade_level,
    subject: subject?.name,
    chapterNumber: chapter?.order_index,
    chapterName: chapter?.name,
    contentType: resolveContentType({
      contentSection: rawResource?.content_section,
      resourceType: rawResource?.resource_type,
      title: rawResource?.title,
    }),
  });

  return {
    resourceId,
    title: rawResource?.title || resource.resourceTitle,
    pageCount,
    priceRs,
    priceMinor: Math.round(priceRs * 100),
    hasLightVersion: resource.hasLightVersion,
    hasDarkVersion: resource.hasDarkVersion,
    coverSvg,
  };
}
