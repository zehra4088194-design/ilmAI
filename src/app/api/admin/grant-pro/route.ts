import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

// POST /api/admin/grant-pro
// body: { userId: string, tier: 'FREE' | 'PRO' | 'ELITE', lifetime?: boolean }
// Lets an admin manually move any user onto Pro/Elite (or back to Free) for free,
// bypassing Paddle/PayPro entirely. Used by the admin Users panel.
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user: adminUser },
  } = await supabase.auth.getUser();

  if (!adminUser || !ADMIN_EMAILS.includes((adminUser.email || '').toLowerCase())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { userId, tier, lifetime } = (await req.json()) as {
    userId: string;
    tier: 'FREE' | 'PRO' | 'ELITE';
    lifetime?: boolean;
  };

  if (!userId || !['FREE', 'PRO', 'ELITE'].includes(tier)) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const adminClient = await createAdminClient();

  const expiresAt =
    tier === 'FREE'
      ? null
      : lifetime
        ? null // null expiry = never expires (lifetime pro/elite)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await adminClient
    .from('profiles')
    .update({
      subscription_tier: tier,
      subscription_expires_at: expiresAt,
    })
    .eq('id', userId);

  if (error) {
    console.error('grant-pro error:', error);
    return NextResponse.json({ error: 'Update fail ho gaya' }, { status: 500 });
  }

  return NextResponse.json({ success: true, tier, expiresAt });
}
