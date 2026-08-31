import { NextRequest, NextResponse } from 'next/server';
import { requireSellerUser } from '@/lib/ads/seller-auth';
import { createServiceClient } from '@/lib/supabase/service';
import { saveAdBannerImage, deleteAdBannerImage } from '@/lib/ads/storage';
import { AD_PLACEMENTS, AD_TARGET_AUDIENCES, isAdPlacement } from '@/lib/ads/constants';

export const runtime = 'nodejs';

const TITLE_MAX = 200;

function cleanString(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function parseDateField(value: unknown): string | null {
  const cleaned = cleanString(value, 40);
  if (!cleaned) return null;
  const date = new Date(cleaned);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function parseCategoriesField(values: unknown[]) {
  return [...new Set(values.map((v) => String(v).trim()).filter(Boolean))].slice(0, 3);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const seller = await requireSellerUser();
  if (!seller) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  const supabase = createServiceClient();

  const { data: existing, error: fetchError } = await supabase.from('ad_banners').select('*').eq('id', id).maybeSingle();
  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 400 });
  if (!existing) return NextResponse.json({ error: 'Banner not found.' }, { status: 404 });
  // A seller can only ever touch a banner they created — never another seller's or admin's.
  if (existing.created_by !== seller.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const contentType = req.headers.get('content-type') || '';
  const updates: Record<string, unknown> = {};
  let newImageUrl: string | null = null;

  try {
    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      const title = cleanString(form.get('title'), TITLE_MAX);
      const targetUrl = cleanString(form.get('targetUrl'), 2048);
      const placement = cleanString(form.get('placement'), 40);
      const image = form.get('image');

      if (title) updates.title = title;
      if (targetUrl) updates.target_url = targetUrl;
      if (form.has('categories')) updates.categories = parseCategoriesField(form.getAll('categories'));
      if (placement) {
        if (!isAdPlacement(placement)) {
          return NextResponse.json({ error: `Placement must be one of: ${AD_PLACEMENTS.join(', ')}.` }, { status: 400 });
        }
        updates.placement = placement;
      }
      if (form.has('targetAudience')) {
        const audience = cleanString(form.get('targetAudience'), 20);
        updates.target_audience = (AD_TARGET_AUDIENCES as readonly string[]).includes(audience) ? audience : null;
      }
      if (form.has('weight')) {
        const weightRaw = Number(cleanString(form.get('weight'), 10));
        updates.weight = Number.isFinite(weightRaw) && weightRaw > 0 ? Math.floor(weightRaw) : existing.weight;
      }
      if (form.has('isActive')) updates.is_active = cleanString(form.get('isActive'), 10) !== 'false';
      if (form.has('startsAt')) updates.starts_at = parseDateField(form.get('startsAt'));
      if (form.has('endsAt')) updates.ends_at = parseDateField(form.get('endsAt'));
      if (image instanceof File && image.size > 0) {
        const uploaded = await saveAdBannerImage(image);
        newImageUrl = uploaded.url;
        updates.image_url = uploaded.url;
      }
    } else {
      const body = await req.json();
      if (typeof body.title === 'string') updates.title = cleanString(body.title, TITLE_MAX);
      if (typeof body.targetUrl === 'string') updates.target_url = cleanString(body.targetUrl, 2048);
      if (Array.isArray(body.categories)) updates.categories = parseCategoriesField(body.categories);
      if (typeof body.placement === 'string') {
        if (!isAdPlacement(body.placement)) {
          return NextResponse.json({ error: `Placement must be one of: ${AD_PLACEMENTS.join(', ')}.` }, { status: 400 });
        }
        updates.placement = body.placement;
      }
      if ('targetAudience' in body) {
        updates.target_audience =
          typeof body.targetAudience === 'string' && (AD_TARGET_AUDIENCES as readonly string[]).includes(body.targetAudience)
            ? body.targetAudience
            : null;
      }
      if (typeof body.weight === 'number' && body.weight > 0) updates.weight = Math.floor(body.weight);
      if (typeof body.isActive === 'boolean') updates.is_active = body.isActive;
      if ('startsAt' in body) updates.starts_at = parseDateField(body.startsAt);
      if ('endsAt' in body) updates.ends_at = parseDateField(body.endsAt);
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid request.' }, { status: 400 });
  }

  if (!Object.keys(updates).length) return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase.from('ad_banners').update(updates).eq('id', id).select('*').single();
  if (error) {
    if (newImageUrl) await deleteAdBannerImage(newImageUrl);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (newImageUrl && existing.image_url && existing.image_url !== newImageUrl) {
    await deleteAdBannerImage(existing.image_url);
  }

  return NextResponse.json({ banner: data });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const seller = await requireSellerUser();
  if (!seller) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  const supabase = createServiceClient();

  const { data: existing } = await supabase.from('ad_banners').select('created_by, image_url').eq('id', id).maybeSingle();
  if (!existing) return NextResponse.json({ error: 'Banner not found.' }, { status: 404 });
  if (existing.created_by !== seller.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { error } = await supabase.from('ad_banners').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (existing.image_url) await deleteAdBannerImage(existing.image_url);
  return NextResponse.json({ success: true });
}
