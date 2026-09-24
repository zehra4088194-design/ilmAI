import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { countPdfPages } from '@/lib/library/pdfPageCount';
import { syncNotesProduct } from '@/lib/library/notesProductSync';
import { getPlatformSettings } from '@/lib/platform-settings/server';
import { computeNotesOrderPriceRs } from '@/lib/platform-settings/shared';
import { generateStudyCoverSvg, resolveContentType } from '@/lib/library/studyCoverSvg';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/library/resources/[id]/order-notes — "Order printed notes" button on a library
 * resource card. Resolves (counting once, then caching — see library_resources.page_count) how
 * many pages the resource's PDF has, prices a printed copy at the admin-configured rate per 2
 * pages, and makes sure a matching product exists on ilmai.store (creating it the first time,
 * updating its price on every later call in case the rate or page count ever changes) — then
 * hands back that product's URL for the client to send the student to.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Login required.' }, { status: 401 });

    const db = createServiceClient();
    const { data: resource } = await (db.from('library_resources') as any)
      .select(
        'id, title, light_file_url, dark_file_url, drive_url, page_count, resource_type, content_section, grade_level, subjects(name), chapters(name, order_index)'
      )
      .eq('id', id)
      .maybeSingle();
    if (!resource) return NextResponse.json({ error: 'This resource could not be found.' }, { status: 404 });

    let pageCount: number | null = resource.page_count || null;
    if (!pageCount) {
      const candidateUrls = [resource.light_file_url, resource.dark_file_url, resource.drive_url].filter(
        (url): url is string => Boolean(url)
      );
      for (const url of candidateUrls) {
        pageCount = await countPdfPages(url);
        if (pageCount) break;
      }
      if (!pageCount) {
        return NextResponse.json(
          { error: 'Could not read this file to count its pages yet. Please try again shortly.' },
          { status: 422 }
        );
      }
      // Best-effort cache — a failed write here just means the next order re-counts once more.
      await (db.from('library_resources') as any).update({ page_count: pageCount }).eq('id', id);
    }

    const settings = await getPlatformSettings();
    const priceRs = computeNotesOrderPriceRs(settings, pageCount);
    const priceMinor = Math.round(priceRs * 100);

    const subjectRow = Array.isArray(resource.subjects) ? resource.subjects[0] : resource.subjects;
    const chapterRow = Array.isArray(resource.chapters) ? resource.chapters[0] : resource.chapters;
    const coverSvg = generateStudyCoverSvg({
      className: resource.grade_level,
      subject: subjectRow?.name,
      chapterNumber: chapterRow?.order_index,
      chapterName: chapterRow?.name,
      contentType: resolveContentType({
        contentSection: resource.content_section,
        resourceType: resource.resource_type,
        title: resource.title,
      }),
    });

    const product = await syncNotesProduct({
      resourceId: resource.id,
      title: resource.title,
      priceMinor,
      pageCount,
      hasLightVersion: Boolean(resource.light_file_url),
      hasDarkVersion: Boolean(resource.dark_file_url),
      coverSvg,
    });

    return NextResponse.json({ url: product.url, pageCount, priceRs });
  } catch (error) {
    console.error('Order-notes failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not start this order.' },
      { status: 500 }
    );
  }
}
