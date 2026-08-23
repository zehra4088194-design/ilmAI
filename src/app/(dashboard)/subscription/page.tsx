import { Metadata } from 'next';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { SubscriptionPlans } from '@/components/features/subscription/SubscriptionPlans';
import { RolePlanCards, type RolePlanTierCard } from '@/components/features/subscription/RolePlanCards';
import { getPaymentAvailability } from '@/lib/payments';
import { getPlatformSettings } from '@/lib/platform-settings/server';
import { getCurrencyForBoard, getCurrencyForCountry } from '@/lib/constants';
import { resolvePlanFamily } from '@/lib/platform-settings/planFamily';
import { getSchoolContext } from '@/lib/school-erp/access';
import { getCollegeContext } from '@/lib/college-erp/access';
export const metadata: Metadata = { title: 'Subscription' };

export default async function SubscriptionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier, subscription_expires_at, board, role, education_level')
    .eq('id', user!.id)
    .single();
  const requestHeaders = await headers();
  const paymentAvailability = getPaymentAvailability(requestHeaders);
  const requestCountry = requestHeaders.get('cf-ipcountry') || requestHeaders.get('x-country-code');
  const currency = profile?.board ? getCurrencyForBoard(profile.board) : getCurrencyForCountry(requestCountry || 'PK');
  const settings = await getPlatformSettings();

  const [schoolContext, collegeContext] = await Promise.all([
    getSchoolContext(supabase, user!.id),
    getCollegeContext(supabase, user!.id),
  ]);
  const planFamily = resolvePlanFamily({
    role: profile?.role,
    educationLevel: profile?.education_level,
    hasInstitutionMembership: Boolean(schoolContext || collegeContext),
  });
  const currentTier = profile?.subscription_tier || 'FREE';

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Subscription</h1>
        <p className="text-muted-foreground">Manage your plan and upgrade your account.</p>
      </div>
      {planFamily === 'institution' ? (
        <div className="rounded-2xl border border-violet-500/25 bg-violet-500/10 p-6 text-sm">
          <p className="font-semibold">Your plan is managed by your institution</p>
          <p className="text-muted-foreground mt-2">
            {schoolContext?.organization.name || collegeContext?.organization.name} controls billing for your account
            — see{' '}
            <a href={schoolContext ? '/school-admin/settings' : '/college-admin/settings'} className="text-primary underline">
              institution billing
            </a>{' '}
            if you're an owner/admin, or contact your school/college for plan details.
          </p>
        </div>
      ) : planFamily === 'parent' ? (
        <RolePlanCards
          familyLabel="Parent"
          currentTier={currentTier}
          currency={currency}
          settings={settings}
          tiers={parentTierCards(settings)}
        />
      ) : planFamily === 'teacher' ? (
        <RolePlanCards
          familyLabel="Teacher"
          currentTier={currentTier}
          currency={currency}
          settings={settings}
          tiers={roleTierCards(settings.teacherPlans, (t) => `${t.classroomsMax ?? 'Unlimited'} classrooms`)}
        />
      ) : planFamily === 'university' ? (
        <RolePlanCards
          familyLabel="University"
          currentTier={currentTier}
          currency={currency}
          settings={settings}
          tiers={roleTierCards(settings.universityPlans, (t) => `${t.aiCreditsMonthly.toLocaleString()} AI credits/month`)}
        />
      ) : (
        <SubscriptionPlans
          currentTier={currentTier}
          paymentAvailability={paymentAvailability}
          currency={currency}
          settings={settings}
        />
      )}
    </div>
  );
}

function parentTierCards(settings: Awaited<ReturnType<typeof getPlatformSettings>>): RolePlanTierCard[] {
  const { parentPlans } = settings;
  return [
    { key: 'FREE', name: 'Free', priceUsdMonthly: 0, limitLabel: `${parentPlans.freeChildrenMax} child linked free` },
    {
      key: 'PRO',
      name: 'Pro',
      priceUsdMonthly: parentPlans.paid.priceUsdMonthly,
      limitLabel: `${parentPlans.paid.childrenMax ?? 'Unlimited'} children linked`,
    },
    {
      key: 'ELITE',
      name: 'Elite',
      priceUsdMonthly: parentPlans.elite.priceUsdMonthly,
      limitLabel: `${parentPlans.elite.childrenMax ?? 'Unlimited'} children linked`,
    },
  ];
}

function roleTierCards<T extends { free: { priceUsdMonthly: number }; paid: { priceUsdMonthly: number }; elite: { priceUsdMonthly: number } }>(
  plans: T,
  limitLabel: (tier: T['paid']) => string
): RolePlanTierCard[] {
  return [
    { key: 'FREE', name: 'Free', priceUsdMonthly: plans.free.priceUsdMonthly, limitLabel: limitLabel(plans.free as T['paid']) },
    { key: 'PRO', name: 'Pro', priceUsdMonthly: plans.paid.priceUsdMonthly, limitLabel: limitLabel(plans.paid) },
    { key: 'ELITE', name: 'Elite', priceUsdMonthly: plans.elite.priceUsdMonthly, limitLabel: limitLabel(plans.elite) },
  ];
}
