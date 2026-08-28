import { NextRequest, NextResponse } from 'next/server';
import { requireSchoolContext } from '@/lib/school-erp/access';
import { requireCollegeContext } from '@/lib/college-erp/access';
import { getActiveStudentCount } from '@/lib/institution-payments/actions';
import { getPlatformSettings } from '@/lib/platform-settings/server';
import { resolveInstitutionPricing } from '@/lib/platform-settings/shared';
import { createInstitutionCheckout, PaddleRequestError } from '@/lib/payments/paddle';
import { getPaymentAvailability } from '@/lib/payments';
import { getSiteUrl } from '@/lib/utils/siteUrl';

// Lets a principal (school/college owner or admin) pay for their institution's plan directly by
// card instead of the manual JazzCash/Easypaisa/bank flow — see InstitutionPaymentCheckout's new
// "Pay now with card" button. The amount is always recomputed here from resolveInstitutionPricing()
// using the organization's real current student count, never trusted from the client, so it can
// never diverge from what's actually displayed on the settings page.
export async function POST(req: NextRequest) {
  try {
    if (getPaymentAvailability(req.headers).consumptionOnly) {
      return NextResponse.json(
        { status: 'consumption_only', error: 'External checkout is not available in the Play Store app.' },
        { status: 403 }
      );
    }

    const body = (await req.json()) as { billingCycle?: 'monthly' | 'annual' };
    const billingCycle = body.billingCycle === 'annual' ? 'annual' : 'monthly';

    const { user: schoolUser, context: schoolContext } = await requireSchoolContext('organization.manage');
    const { user: collegeUser, context: collegeContext } = schoolContext
      ? { user: null, context: null }
      : await requireCollegeContext('organization.manage');

    const user = schoolUser || collegeUser;
    if (!user) return NextResponse.json({ status: 'error', error: 'Login required' }, { status: 401 });

    const context = schoolContext || collegeContext;
    if (!context) {
      return NextResponse.json(
        { status: 'error', error: 'Only a school/college owner or admin can pay for the institution plan.' },
        { status: 403 }
      );
    }

    const institutionType: 'school' | 'college' = schoolContext ? 'school' : 'college';
    const organizationId = context.organization.id;
    const settings = await getPlatformSettings();
    const studentCount = await getActiveStudentCount(institutionType, organizationId);
    const pricing = resolveInstitutionPricing(settings, institutionType, billingCycle, studentCount);

    const appUrl = getSiteUrl();
    const settingsPath = institutionType === 'school' ? '/school-admin/settings' : '/college-admin/settings';
    const session = await createInstitutionCheckout({
      organizationId,
      institutionType,
      billingCycle,
      amountUsd: pricing.usd,
      userId: user.id,
      userEmail: user.email || '',
      successUrl: `${appUrl}${settingsPath}?success=true`,
      cancelUrl: `${appUrl}${settingsPath}?canceled=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const isPaddleError = error instanceof PaddleRequestError;
    const message = error instanceof Error ? error.message : 'Unknown checkout error';
    console.error('Institution checkout session error:', {
      message,
      provider: isPaddleError ? 'paddle' : undefined,
      providerStatus: isPaddleError ? error.status : undefined,
    });
    const errorMessage =
      process.env.NODE_ENV === 'production'
        ? 'The checkout session could not be created.'
        : `The checkout session could not be created: ${message}`;
    return NextResponse.json({ status: 'error', error: errorMessage }, { status: 500 });
  }
}
