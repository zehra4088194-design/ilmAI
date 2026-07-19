import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { getPlatformSettings } from '@/lib/platform-settings/server';
import { getCurrencyForBoard, getCurrencyForCountry } from '@/lib/constants';

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
  const planTier = body.planTier;
  const billingCycle = body.billingCycle;
  const studentCount = Number(body.studentCount);

  if (
    !institutionName ||
    !['school', 'college'].includes(institutionType || '') ||
    !['PRO', 'ELITE'].includes(planTier || '') ||
    !['monthly', 'annual'].includes(billingCycle || '') ||
    !Number.isInteger(studentCount) ||
    studentCount < 1 ||
    studentCount > 100000
  ) {
    return NextResponse.json(
      { error: 'Institution, paid plan, billing aur valid student count required hai.' },
      { status: 400 }
    );
  }

  const settings = await getPlatformSettings();
  const priceKey = billingCycle === 'annual' ? 'annual' : 'monthly';
  const admin = (await createAdminClient()) as any;
  const { data: profile } = await admin.from('profiles').select('full_name, email, board').eq('id', user.id).maybeSingle();
  const requestCountry = req.headers.get('cf-ipcountry') || req.headers.get('x-country-code') || 'PK';
  const currency = profile?.board ? getCurrencyForBoard(profile.board) : getCurrencyForCountry(requestCountry);
  const perStudentPrice = settings.subscriptionPlans[planTier as PlanTier].price[currency][priceKey];
  const rawDiscountedPrice = perStudentPrice * studentCount * 0.5;
  const discountedPrice = currency === 'PKR' ? Math.round(rawDiscountedPrice) : Number(rawDiscountedPrice.toFixed(2));
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
      discounted_price_pkr: currency === 'PKR' ? discountedPrice : null,
      contact_name: body.contactName?.trim() || profile?.full_name || null,
      contact_email: body.contactEmail?.trim().toLowerCase() || profile?.email || user.email || null,
      message: body.message?.trim() || null,
    })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: `Inquiry save nahi hui: ${error.message}` }, { status: 500 });
  return NextResponse.json({ inquiry: data, discountedPrice, currency });
}
