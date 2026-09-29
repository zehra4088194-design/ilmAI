import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { getPlatformSettings } from '@/lib/platform-settings/server';
import { resolveInstitutionPricing } from '@/lib/platform-settings/shared';

type PlanTier = 'PRO' | 'ELITE';
type BillingCycle = 'monthly' | 'annual';
type InstitutionType = 'school' | 'college';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const body = (await req.json()) as {
    institutionName?: string;
    institutionType?: InstitutionType;
    studentCount?: number;
    planTier?: PlanTier;
    billingCycle?: BillingCycle;
    contactName?: string;
    contactEmail?: string;
    message?: string;
  };
  const institutionName = body.institutionName?.trim() || '';
  const institutionType = body.institutionType;
  const planTier = body.planTier || 'PRO';
  const billingCycle = body.billingCycle;
  const studentCount = Number(body.studentCount);

  if (
    !institutionName ||
    !['school', 'college'].includes(institutionType || '') ||
    !['PRO', 'ELITE'].includes(planTier) ||
    !['monthly', 'annual'].includes(billingCycle || '') ||
    !Number.isInteger(studentCount) ||
    studentCount < 1 ||
    studentCount > 100000
  ) {
    return NextResponse.json(
      { error: 'Institution, billing cycle, and a valid student count are required.' },
      { status: 400 }
    );
  }

  const settings = await getPlatformSettings();
  const admin = (await createAdminClient()) as any;
  const { data: profile } = await admin
    .from('profiles')
    .select('full_name, email, board')
    .eq('id', user.id)
    .maybeSingle();
  const quote = resolveInstitutionPricing(
    settings,
    institutionType as InstitutionType,
    billingCycle as BillingCycle,
    studentCount
  );
  const discountedPrice = quote.pkr;
  const currency = 'PKR';
  const { data, error } = await admin
    .from('institution_plan_inquiries')
    .insert({
      contact_user_id: user.id,
      institution_name: institutionName,
      institution_type: institutionType,
      student_count: studentCount,
      plan_tier: planTier,
      billing_cycle: billingCycle,
      quote_currency: currency,
      discounted_price: discountedPrice,
      discounted_price_pkr: discountedPrice,
      contact_name: body.contactName?.trim() || profile?.full_name || null,
      contact_email: body.contactEmail?.trim().toLowerCase() || profile?.email || user.email || null,
      message: body.message?.trim() || null,
    })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: `The inquiry could not be saved.: ${error.message}` }, { status: 500 });
  return NextResponse.json({ inquiry: data, discountedPrice, currency, approximateUsd: quote.usd });
}
