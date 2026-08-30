import { NextRequest, NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/admin/auth';
import { createServiceClient } from '@/lib/supabase/service';
import { listBannersWithStats } from '@/lib/ads/admin-queries';
import { saveAdBannerImage, deleteAdBannerImage } from '@/lib/ads/storage';
import { AD_PLACEMENTS, AD_TARGET_AUDIENCES, isAdPlacement } from '@/lib/ads/constants';

export const runtime = 'nodejs';

const TITLE_MAX = 200;

function cleanText(value: FormDataEntryValue | null, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function parseTargetAudience(value: FormDataEntryValue | null) {
  const cleaned = cleanText(value, 20);
  return (AD_TARGET_AUDIENCES as readonly string[]).includes(cleaned) ? cleaned : null;
}

function parseDate(value: FormDataEntryValue | null) {
  const cleaned = cleanText(value, 40);
  if (!cleaned) return null;
  const date = new Date(cleaned);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export async function GET(req: NextRequest) {
  if (!(await requireAdminUser())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const from = req.nextUrl.searchParams.get('from') || undefined;
  const to = req.nextUrl.searchParams.get('to') || undefined;
  const stats = await listBannersWithStats({ from, to });
  return NextResponse.json({ banners: stats });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const form = await req.formData();
    const title = cleanText(form.get('title'), TITLE_MAX);
    const targetUrl = cleanText(form.get('targetUrl'), 2048);
    const placement = cleanText(form.get('placement'), 40);
    const image = form.get('image');

    if (!title) return NextResponse.json({ error: 'Title is required.' }, { status: 400 });
    if (!targetUrl) return NextResponse.json({ error: 'Target URL is required.' }, { status: 400 });
    if (!isAdPlacement(placement)) {
      return NextResponse.json({ error: `Placement must be one of: ${AD_PLACEMENTS.join(', ')}.` }, { status: 400 });
    }
    if (!(image instanceof File) || image.size === 0) {
      return NextResponse.json({ error: 'A banner image is required.' }, { status: 400 });
    }

    const weightRaw = Number(cleanText(form.get('weight'), 10));
    const weight = Number.isFinite(weightRaw) && weightRaw > 0 ? Math.floor(weightRaw) : 1;
    const isActive = cleanText(form.get('isActive'), 10) !== 'false';
    const targetAudience = parseTargetAudience(form.get('targetAudience'));
    const startsAt = parseDate(form.get('startsAt'));
    const endsAt = parseDate(form.get('endsAt'));

    const uploaded = await saveAdBannerImage(image);

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('ad_banners')
      .insert({
        title,
        image_url: uploaded.url,
        target_url: targetUrl,
        placement,
        target_audience: targetAudience,
        weight,
        is_active: isActive,
        starts_at: startsAt,
        ends_at: endsAt,
        created_by: admin.id,
      })
      .select('*')
      .single();

    if (error) {
      await deleteAdBannerImage(uploaded.url);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ banner: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Banner could not be created.' }, { status: 400 });
  }
}
