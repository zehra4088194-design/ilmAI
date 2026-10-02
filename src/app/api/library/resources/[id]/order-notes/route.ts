import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { syncNotesProduct } from '@/lib/library/notesProductSync';
import { resolvePrintableStudyNote } from '@/lib/library/studyNotesStoreCatalog';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/library/resources/[id]/order-notes — backwards-compatible shortcut for the
 * existing "Order printed notes" button. The new Store flow uses the catalog/detail route,
 * but this endpoint remains valid for old links and integrations.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Login required.' }, { status: 401 });

    const resolved = await resolvePrintableStudyNote(id);
    const product = await syncNotesProduct({
      resourceId: resolved.resourceId,
      title: resolved.title,
      priceMinor: resolved.priceMinor,
      pageCount: resolved.pageCount,
      hasLightVersion: resolved.hasLightVersion,
      hasDarkVersion: resolved.hasDarkVersion,
      coverSvg: resolved.coverSvg,
    });

    return NextResponse.json({ url: product.url, pageCount: resolved.pageCount, priceRs: resolved.priceRs });
  } catch (error) {
    console.error('Order-notes failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not start this order.' },
      { status: 500 },
    );
  }
}
