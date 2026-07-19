'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Building2, Check, Crown, Rocket, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CURRENCY_SYMBOLS, type Currency } from '@/lib/constants';
import { cn } from '@/lib/utils/cn';
import { toast } from 'sonner';
import { DEFAULT_PLATFORM_SETTINGS, type PlatformSettings } from '@/lib/platform-settings/shared';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { PaymentAvailability } from '@/lib/payments';

type BillingCycle = 'monthly' | 'annual';
type TierKey = 'FREE' | 'PRO' | 'ELITE';
type InstitutionType = 'school' | 'college';
type InstitutionPlan = 'PRO' | 'ELITE';
const PLAN_KEYS: TierKey[] = ['FREE', 'PRO', 'ELITE'];

export function SubscriptionPlans({
  currentTier,
  paymentAvailability,
  currency,
  settings = DEFAULT_PLATFORM_SETTINGS,
}: {
  currentTier: string;
  paymentAvailability: PaymentAvailability;
  currency: Currency;
  settings?: PlatformSettings;
}) {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [institutionType, setInstitutionType] = useState<InstitutionType>('college');
  const [institutionPlan, setInstitutionPlan] = useState<InstitutionPlan>('PRO');
  const [studentCount, setStudentCount] = useState('50');
  const [institutionName, setInstitutionName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [institutionMessage, setInstitutionMessage] = useState('');
  const [inquiryLoading, setInquiryLoading] = useState(false);
  const searchParams = useSearchParams();
  const symbol = CURRENCY_SYMBOLS[currency];
  const free = settings.subscriptionPlans.FREE;
  const pro = settings.subscriptionPlans.PRO;
  const elite = settings.subscriptionPlans.ELITE;
  const institutionCount = Math.max(0, Number(studentCount) || 0);
  const institutionBasePrice =
    settings.subscriptionPlans[institutionPlan].price[currency][billingCycle === 'annual' ? 'annual' : 'monthly'];
  const institutionDiscountedPrice = institutionBasePrice * institutionCount * 0.5;

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast.success('Payment received. Your plan is syncing.');
    } else if (searchParams.get('canceled') === 'true') {
      toast.info('Checkout was cancelled.');
    }
  }, [searchParams]);

  useEffect(() => {
    const rawDraft = window.sessionStorage.getItem('ilm-ai-institution-inquiry-draft');
    if (!rawDraft) return;

    try {
      const draft = JSON.parse(rawDraft) as {
        institutionName?: string;
        institutionType?: InstitutionType;
        studentCount?: number;
        planTier?: InstitutionPlan;
        billingCycle?: BillingCycle;
        contactName?: string;
        contactEmail?: string;
        message?: string;
      };
      if (draft.institutionName) setInstitutionName(draft.institutionName);
      if (draft.institutionType === 'school' || draft.institutionType === 'college') {
        setInstitutionType(draft.institutionType);
      }
      if (draft.studentCount && draft.studentCount > 0) setStudentCount(String(draft.studentCount));
      if (draft.planTier === 'PRO' || draft.planTier === 'ELITE') setInstitutionPlan(draft.planTier);
      if (draft.billingCycle === 'monthly' || draft.billingCycle === 'annual') {
        setBillingCycle(draft.billingCycle);
      }
      if (draft.contactName) setContactName(draft.contactName);
      if (draft.contactEmail) setContactEmail(draft.contactEmail);
      if (draft.message) setInstitutionMessage(draft.message);
      window.setTimeout(
        () => document.getElementById('institution-plans')?.scrollIntoView({ behavior: 'smooth' }),
        100
      );
    } catch {
      window.sessionStorage.removeItem('ilm-ai-institution-inquiry-draft');
    }
  }, []);

  const submitInstitutionInquiry = async () => {
    if (!institutionName.trim() || institutionCount < 1) {
      toast.error('Enter the school/college name and number of students.');
      return;
    }
    setInquiryLoading(true);
    try {
      const response = await fetch('/api/institution-plan-inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          institutionName,
          institutionType,
          studentCount: institutionCount,
          planTier: institutionPlan,
          billingCycle,
          contactName,
          contactEmail,
          message: institutionMessage,
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Inquiry could not be sent.');
      toast.success('School/college inquiry sent to admin.');
      window.sessionStorage.removeItem('ilm-ai-institution-inquiry-draft');
      setInstitutionMessage('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Inquiry could not be sent.');
    } finally {
      setInquiryLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-violet-500/25 bg-violet-500/10 p-4 text-sm">
        <p id="credits" className="font-semibold">One shared AI credit pool</p>
        <p className="text-muted-foreground mt-2">
          Free: {free.limits.aiCreditsWeekly} credits/week. Pro: {pro.limits.aiCreditsMonthly}/month, max{' '}
          {pro.limits.aiCreditsDaily}/day. Elite: {elite.limits.aiCreditsMonthly}/month, max{' '}
          {elite.limits.aiCreditsDaily}/day plus {elite.limits.premiumAiMonthly} premium calls/month.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
          {[
            ['Tutor / side chat', 1],
            ['Flashcards / practice', 2],
            ['Summary / PharmaPulse', 4],
            ['Full test / guess paper', 4],
            ['Presentation', 8],
          ].map(([label, cost]) => (
            <span key={String(label)} className="rounded-full border border-border/70 bg-background/50 px-2.5 py-1">
              {label}: <strong className="text-foreground">{cost}</strong>
            </span>
          ))}
        </div>
      </div>

      {paymentAvailability.consumptionOnly && (
        <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 p-4 text-sm">
          <p className="font-semibold">The Play Store app is in consumption-only mode</p>
          <p className="text-muted-foreground mt-1">
            Existing plans are used and synced here. External checkout and institutional purchase inquiries are not
            available in this app build.
          </p>
        </div>
      )}

      <div className="border-border bg-background/70 inline-flex items-center gap-3 rounded-full border p-1.5">
        <button
          onClick={() => setBillingCycle('monthly')}
          className={cn(
            'rounded-full px-4 py-2 text-sm font-medium transition-all',
            billingCycle === 'monthly' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
          )}
        >
          Monthly
        </button>
        <button
          onClick={() => setBillingCycle('annual')}
          className={cn(
            'rounded-full px-4 py-2 text-sm font-medium transition-all',
            billingCycle === 'annual' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
          )}
        >
          Yearly
          <Badge variant="success" className="ml-2 text-[10px]">
            20% Off
          </Badge>
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {PLAN_KEYS.filter((key) => settings.subscriptionPlans[key].enabled).map((key) => {
          const plan = settings.subscriptionPlans[key];
          const isCurrent = currentTier === key;
          const isFree = key === 'FREE';
          const pricing = plan.price[currency];
          const displayPrice = billingCycle === 'annual' && !isFree ? pricing.annual : pricing.monthly;
          const priceSuffix = billingCycle === 'annual' && !isFree ? '/year' : '/mo';
          const monthlyEquivalent = billingCycle === 'annual' && !isFree ? pricing.annual / 12 : null;
          const PlanIcon = key === 'FREE' ? Sparkles : key === 'PRO' ? Rocket : Crown;
          const iconBg =
            key === 'FREE'
              ? 'from-slate-500 to-gray-600'
              : key === 'PRO'
                ? 'from-violet-500 to-indigo-600'
                : 'from-amber-500 to-orange-600';

          return (
            <Card key={key} className={cn(isCurrent && 'border-violet-500/50 shadow-lg shadow-violet-500/10')}>
              <CardContent className="p-6">
                {isCurrent && (
                  <Badge variant="default" className="mb-3 bg-violet-600">
                    Current Plan
                  </Badge>
                )}
                {billingCycle === 'annual' && !isFree && (
                  <div className="mb-3">
                    <Badge
                      className={cn(
                        'rounded-full border-0 px-3 py-1 text-[11px] font-semibold tracking-[0.18em] text-white uppercase',
                        key === 'ELITE'
                          ? 'bg-gradient-to-r from-amber-500 to-orange-600'
                          : 'bg-gradient-to-r from-violet-500 to-indigo-600'
                      )}
                    >
                      20% Off
                    </Badge>
                  </div>
                )}
                <div
                  className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${iconBg} shadow-lg`}
                >
                  <PlanIcon className="h-5 w-5 text-white" />
                </div>
                <h3 className="mb-2 text-xl font-bold">{plan.name}</h3>
                <div className="mb-4">
                  <p className="text-3xl font-bold">
                    {symbol}
                    {formatPrice(displayPrice, currency)}
                    <span className="text-muted-foreground text-sm font-normal">{priceSuffix}</span>
                  </p>
                  {monthlyEquivalent !== null && (
                    <p className="text-muted-foreground mt-1 text-sm">
                      {symbol}
                      {formatPrice(monthlyEquivalent, currency)}/mo effective
                    </p>
                  )}
                </div>
                <ul className="mb-6 space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 shrink-0 text-green-500" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {isCurrent || isFree ? (
                  <Button variant="outline" className="w-full" disabled>
                    {isCurrent ? 'Current Plan' : 'Free Plan'}
                  </Button>
                ) : paymentAvailability.consumptionOnly ? (
                  <Button variant="outline" className="w-full" disabled>
                    Existing subscriptions only
                  </Button>
                ) : currentTier === 'PRO' || currentTier === 'ELITE' ? (
                  <Button variant="outline" className="w-full" disabled>
                    Contact support to change plan
                  </Button>
                ) : (
                  <Button asChild className="w-full" variant="gradient">
                    <Link href={`/subscription/${key.toLowerCase()}?billing=${billingCycle}`}>
                      Checkout {plan.name}
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {!paymentAvailability.consumptionOnly && (
        <Card
          id="institution-plans"
          className="border-primary/25 from-primary/10 via-card to-accent/10 scroll-mt-24 overflow-hidden bg-gradient-to-br"
        >
          <CardContent className="p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <Badge className="bg-primary text-primary-foreground mb-3">Schools and Colleges</Badge>
                <h2 className="flex items-center gap-2 text-xl font-bold">
                  <Building2 className="text-primary h-5 w-5" /> Institutional plans
                </h2>
                <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
                  Apne school ya college ke students ki tadaad select karein. Pro/Elite plan per-student price par 50%
                  discount ke saath admin se direct connection milega.
                </p>
              </div>
              <div className="border-primary/20 bg-background/60 rounded-xl border px-4 py-3 text-right">
                <p className="text-muted-foreground text-xs">Estimated total</p>
                <p className="text-primary text-2xl font-bold">
                  {symbol}
                  {formatPrice(institutionDiscountedPrice, currency)}
                </p>
                <p className="text-muted-foreground text-xs">50% discounted, {billingCycle}</p>
              </div>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-2 block text-sm font-medium">Institution type</label>
                <Select value={institutionType} onValueChange={(value) => setInstitutionType(value as InstitutionType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="school">School</SelectItem>
                    <SelectItem value="college">College</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Paid plan</label>
                <Select value={institutionPlan} onValueChange={(value) => setInstitutionPlan(value as InstitutionPlan)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PRO">Pro</SelectItem>
                    <SelectItem value="ELITE">Elite</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Billing</label>
                <Select value={billingCycle} onValueChange={(value) => setBillingCycle(value as BillingCycle)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="annual">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Number of students</label>
                <Input
                  type="number"
                  min={1}
                  max={100000}
                  value={studentCount}
                  onChange={(event) => setStudentCount(event.target.value)}
                />
              </div>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Input
                value={institutionName}
                onChange={(event) => setInstitutionName(event.target.value)}
                placeholder="School / college name"
              />
              <Input
                value={contactName}
                onChange={(event) => setContactName(event.target.value)}
                placeholder="Contact person name"
              />
              <Input
                type="email"
                value={contactEmail}
                onChange={(event) => setContactEmail(event.target.value)}
                placeholder="Contact email"
              />
              <Input
                value={institutionMessage}
                onChange={(event) => setInstitutionMessage(event.target.value)}
                placeholder="Message or preferred contact time (optional)"
              />
            </div>
            <Button className="mt-5" variant="gradient" onClick={submitInstitutionInquiry} loading={inquiryLoading}>
              Send inquiry to admin
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function formatPrice(value: number, currency: Currency) {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: currency === 'USD' ? 2 : 0,
    maximumFractionDigits: currency === 'USD' ? 2 : 0,
  });
}
