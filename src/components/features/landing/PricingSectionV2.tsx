'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/auth/useAuth';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { resolveInstitutionPricing, resolvePlanAmountUsd } from '@/lib/platform-settings/shared';
import { calculateTransactionFee } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Audience = 'student' | 'parent' | 'teacher' | 'university' | 'institution';
type BillingCycle = 'monthly' | 'annual';
type InstitutionType = 'school' | 'college';

type PlanOption = {
  name: string;
  priceUsd: number;
  features: string[];
  href: string;
  featured?: boolean;
};

const audiences: { id: Audience; label: string }[] = [
  { id: 'student', label: 'Student' },
  { id: 'parent', label: 'Parent' },
  { id: 'teacher', label: 'Teacher' },
  { id: 'university', label: 'University' },
  { id: 'institution', label: 'School / College' },
];

function formatUsd(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(
    amount
  );
}

function formatPkr(amount: number) {
  return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(
    amount
  );
}

export function PricingSectionV2() {
  const router = useRouter();
  const { user } = useAuth();
  const settings = usePlatformSettings();
  const [audience, setAudience] = useState<Audience>('student');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [institutionType, setInstitutionType] = useState<InstitutionType>('school');
  const [institutionName, setInstitutionName] = useState('');
  const [studentCount, setStudentCount] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const count = Math.max(0, Number.parseInt(studentCount, 10) || 0);

  useEffect(() => {
    const savedDraft = sessionStorage.getItem('institutionInquiryDraft');
    if (!savedDraft) return;

    let draft: unknown;
    try {
      draft = JSON.parse(savedDraft);
    } catch {
      sessionStorage.removeItem('institutionInquiryDraft');
      return;
    }

    if (typeof draft !== 'object' || draft === null) return;
    const values = draft as Record<string, unknown>;
    if (
      (values.institutionType !== 'school' && values.institutionType !== 'college') ||
      typeof values.institutionName !== 'string' ||
      typeof values.studentCount !== 'number' ||
      typeof values.contactName !== 'string' ||
      typeof values.contactEmail !== 'string'
    ) {
      sessionStorage.removeItem('institutionInquiryDraft');
      return;
    }

    setInstitutionType(values.institutionType);
    setInstitutionName(values.institutionName);
    setStudentCount(String(values.studentCount));
    setContactName(values.contactName);
    setContactEmail(values.contactEmail);
    setContactPhone(typeof values.contactPhone === 'string' ? values.contactPhone : '');
    if (values.billingCycle === 'monthly' || values.billingCycle === 'annual') {
      setBillingCycle(values.billingCycle);
    }
    setAudience('institution');
    sessionStorage.removeItem('institutionInquiryDraft');
  }, []);

  const plans = useMemo<PlanOption[]>(() => {
    const billing = billingCycle;
    const checkout = (tier: string, family?: string) => {
      const params = new URLSearchParams({ billing });
      if (family) params.set('family', family);
      return `/subscription/${tier.toLowerCase()}?${params.toString()}`;
    };

    if (audience === 'student') {
      return (['FREE', 'PRO', 'ELITE'] as const)
        .filter((tier) => settings.subscriptionPlans[tier].enabled)
        .map((tier) => {
          const plan = settings.subscriptionPlans[tier];
          const priceUsd = billing === 'annual' ? plan.price.USD.annual : plan.price.USD.monthly;
          return {
            name: tier === 'FREE' ? 'Free' : tier === 'PRO' ? 'Pro' : 'Elite',
            priceUsd,
            features: [
              `${plan.limits.aiCreditsMonthly.toLocaleString()} AI credits each month`,
              ...plan.features.slice(0, 4),
            ],
            href: tier === 'FREE' ? '/register' : checkout(tier),
            featured: tier === 'PRO',
          };
        });
    }

    if (audience === 'parent') {
      const parentPlans = settings.parentPlans;
      return [
        {
          name: 'Free',
          priceUsd: 0,
          features: [
            `Link ${parentPlans.freeChildrenMax} ${parentPlans.freeChildrenMax === 1 ? 'child' : 'children'}`,
            'Parent dashboard',
          ],
          href: '/register',
        },
        ...(['paid', 'elite'] as const).map((tier) => {
          const plan = parentPlans[tier];
          return {
            name: tier === 'paid' ? 'Pro' : 'Elite',
            priceUsd:
              tier === 'paid'
                ? resolvePlanAmountUsd(settings, {
                    tier: 'PRO',
                    billingCycle: billing,
                    planFamily: 'parent',
                  })
                : resolvePlanAmountUsd(settings, {
                    tier: 'ELITE',
                    billingCycle: billing,
                    planFamily: 'parent',
                  }),
            features: [
              `${plan.childrenMax === null ? 'Unlimited' : plan.childrenMax} linked children`,
              'Parent dashboard and progress insights',
              ...(tier === 'elite' ? ['Advanced parent analytics'] : []),
            ],
            href: checkout(tier === 'paid' ? 'pro' : 'elite', 'parent'),
            featured: tier === 'paid',
          };
        }),
      ];
    }

    if (audience === 'teacher') {
      const teacherPlans = settings.teacherPlans;
      return (['free', 'paid', 'elite'] as const).map((tier) => {
        const plan = teacherPlans[tier];
        return {
          name: tier === 'free' ? 'Free' : tier === 'paid' ? 'Pro' : 'Elite',
          priceUsd:
            tier === 'free'
              ? 0
              : resolvePlanAmountUsd(settings, {
                  tier: tier === 'paid' ? 'PRO' : 'ELITE',
                  billingCycle: billing,
                  planFamily: 'teacher',
                }),
          features: [
            `${plan.classroomsMax === null ? 'Unlimited' : plan.classroomsMax} classrooms`,
            'Teacher workspace',
            ...(tier === 'elite' ? ['Advanced classroom tools'] : []),
          ],
          href: tier === 'free' ? '/register' : checkout(tier === 'paid' ? 'pro' : 'elite', 'teacher'),
          featured: tier === 'paid',
        };
      });
    }

    const universityPlans = settings.universityPlans;
    return (['free', 'paid', 'elite'] as const).map((tier) => {
      const plan = universityPlans[tier];
      return {
        name: tier === 'free' ? 'Free' : tier === 'paid' ? 'Pro' : 'Elite',
        priceUsd:
          tier === 'free'
            ? 0
            : resolvePlanAmountUsd(settings, {
                tier: tier === 'paid' ? 'PRO' : 'ELITE',
                billingCycle: billing,
                planFamily: 'university',
              }),
        features: [
          `${plan.aiCreditsMonthly.toLocaleString()} AI credits each month`,
          'University study tools',
          ...(tier === 'elite' ? ['Expanded AI usage'] : []),
        ],
        href: tier === 'free' ? '/register' : checkout(tier === 'paid' ? 'pro' : 'elite', 'university'),
        featured: tier === 'paid',
      };
    });
  }, [audience, billingCycle, settings]);

  const institutionQuote = resolveInstitutionPricing(settings, institutionType, billingCycle, count);
  const institutionFeePkr = calculateTransactionFee(institutionQuote.pkr, 'PKR');
  const institutionFeeUsd = calculateTransactionFee(institutionQuote.usd, 'USD');
  const annualInstitutionMonthlyPkr =
    count > 0 ? resolveInstitutionPricing(settings, institutionType, 'monthly', count).pkr : 0;

  async function handleInquiry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (!institutionName.trim() || !contactName.trim() || !contactEmail.trim() || count < 1) {
      setError('Please complete the required fields and enter at least one student.');
      return;
    }

    if (!user) {
      sessionStorage.setItem(
        'institutionInquiryDraft',
        JSON.stringify({
          institutionType,
          institutionName,
          studentCount: count,
          contactName,
          contactEmail,
          contactPhone,
          billingCycle,
        })
      );
      router.push(`/login?redirect=${encodeURIComponent('/pricing#pricing')}`);
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/institution-plan-inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          institutionType,
          institutionName,
          studentCount: count,
          contactName,
          contactEmail,
          contactPhone,
          billingCycle,
          message: contactPhone.trim() ? `Phone: ${contactPhone.trim()}` : '',
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not submit inquiry.');
      setInstitutionName('');
      setStudentCount('');
      setContactName('');
      setContactEmail('');
      setContactPhone('');
      router.push('/subscription?inquiry=submitted');
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Could not submit inquiry.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section id="pricing" className="py-20 sm:py-28">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm">
            <Sparkles className="text-primary h-4 w-4" />
            Plans for every kind of learner
          </div>
          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">Choose the right plan</h2>
          <p className="text-muted-foreground mt-4 text-lg">
            Explore plans for students, families, educators, universities, and institutions.
          </p>
        </div>

        <div className="bg-muted mx-auto mt-10 grid max-w-4xl grid-cols-2 gap-2 rounded-xl p-2 sm:grid-cols-5">
          {audiences.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setAudience(option.id)}
              aria-pressed={audience === option.id}
              className={`rounded-lg px-3 py-3 text-sm font-medium transition-colors ${
                audience === option.id
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {audience !== 'institution' && (
          <>
            <div className="mt-8 flex justify-center">
              <div className="inline-flex rounded-full border p-1">
                {(['monthly', 'annual'] as const).map((cycle) => (
                  <button
                    key={cycle}
                    type="button"
                    onClick={() => setBillingCycle(cycle)}
                    aria-pressed={billingCycle === cycle}
                    className={`rounded-full px-5 py-2 text-sm font-medium capitalize ${
                      billingCycle === cycle ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {cycle}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {plans.map((plan) => (
                <Card key={plan.name} className={`flex flex-col ${plan.featured ? 'border-primary shadow-lg' : ''}`}>
                  <CardHeader>
                    <CardTitle>{plan.name}</CardTitle>
                    <CardDescription>
                      {plan.name === 'Free' ? 'Get started at no cost' : 'Billed ' + billingCycle}
                    </CardDescription>
                    <div className="pt-3">
                      <span className="text-4xl font-bold">{formatUsd(plan.priceUsd)}</span>
                      <span className="text-muted-foreground ml-2 text-sm">
                        /{billingCycle === 'annual' ? 'year' : 'month'}
                      </span>
                      {plan.priceUsd > 0 && settings.exchangeRate.usdToPkr > 0 && (
                        <>
                          <div className="text-muted-foreground mt-1 text-sm">
                            {formatPkr(plan.priceUsd * settings.exchangeRate.usdToPkr)}
                          </div>
                          <p className="text-muted-foreground mt-1 text-xs">
                            + {formatUsd(calculateTransactionFee(plan.priceUsd, 'USD'))} 5% transaction fee (about{' '}
                            {formatPkr(calculateTransactionFee(plan.priceUsd * settings.exchangeRate.usdToPkr, 'PKR'))})
                          </p>
                        </>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col">
                    <ul className="mb-6 flex-1 space-y-3">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-sm">
                          <Check className="text-primary mt-0.5 h-4 w-4 shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button asChild className="w-full" variant={plan.featured ? 'default' : 'outline'}>
                      <Link href={plan.href}>{plan.name === 'Free' ? 'Get started' : 'Choose plan'}</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
            <p className="text-muted-foreground mt-5 text-center text-xs">
              {audience === 'student'
                ? 'Student prices follow the configured monthly and annual rates.'
                : 'Family plans are shown in USD. Annual billing is 20% less than paying month by month.'}
            </p>
          </>
        )}

        {audience === 'institution' && (
          <div className="mx-auto mt-8 grid max-w-5xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Institution plans</CardTitle>
                <CardDescription>
                  Pricing scales with active student enrollment and uses the current configured discounts.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Label htmlFor="institution-type">Institution type</Label>
                <select
                  id="institution-type"
                  value={institutionType}
                  onChange={(event) => setInstitutionType(event.target.value as InstitutionType)}
                  className="bg-background mt-2 h-10 w-full rounded-md border px-3 text-sm"
                >
                  <option value="school">School</option>
                  <option value="college">College</option>
                </select>
                <Label htmlFor="billing-cycle" className="mt-5 block">
                  Billing cycle
                </Label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {(['monthly', 'annual'] as const).map((cycle) => (
                    <Button
                      key={cycle}
                      type="button"
                      variant={billingCycle === cycle ? 'default' : 'outline'}
                      onClick={() => setBillingCycle(cycle)}
                      className="capitalize"
                    >
                      {cycle}
                    </Button>
                  ))}
                </div>
                <div className="bg-muted mt-6 rounded-lg p-4">
                  <p className="text-muted-foreground text-sm">Estimated {billingCycle} total</p>
                  <p className="mt-1 text-3xl font-bold">{formatPkr(institutionQuote.pkr)}</p>
                  {institutionQuote.pkr > 0 && (
                    <p className="text-muted-foreground mt-1 text-xs">
                      + {formatPkr(institutionFeePkr)} / {formatUsd(institutionFeeUsd)} 5% transaction fee
                    </p>
                  )}
                  <p className="text-muted-foreground mt-1 text-sm">Approximately {formatUsd(institutionQuote.usd)}</p>
                  {count > 0 && billingCycle === 'annual' && (
                    <p className="text-muted-foreground mt-3 text-xs">
                      Monthly rate: {formatPkr(annualInstitutionMonthlyPkr)}. Final quote is confirmed by our team.
                    </p>
                  )}
                  {institutionQuote.volumeDiscountApplied && (
                    <p className="text-muted-foreground mt-2 text-xs">Configured volume discount included.</p>
                  )}
                </div>
                <p className="text-muted-foreground mt-4 text-xs">
                  Estimates use the platform&apos;s configured per-student rate, exchange rate, and applicable
                  discounts.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Request an institution quote</CardTitle>
                <CardDescription>
                  Share your enrollment details and our team will follow up with a confirmed plan.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleInquiry} className="space-y-4">
                  <div>
                    <Label htmlFor="institution-name">Institution name</Label>
                    <Input
                      id="institution-name"
                      required
                      value={institutionName}
                      onChange={(event) => setInstitutionName(event.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="student-count">Number of students</Label>
                    <Input
                      id="student-count"
                      type="number"
                      min="1"
                      required
                      value={studentCount}
                      onChange={(event) => setStudentCount(event.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="contact-name">Contact name</Label>
                    <Input
                      id="contact-name"
                      required
                      value={contactName}
                      onChange={(event) => setContactName(event.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="contact-email">Contact email</Label>
                    <Input
                      id="contact-email"
                      type="email"
                      required
                      value={contactEmail}
                      onChange={(event) => setContactEmail(event.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="contact-phone">Phone (optional)</Label>
                    <Input
                      id="contact-phone"
                      type="tel"
                      value={contactPhone}
                      onChange={(event) => setContactPhone(event.target.value)}
                    />
                  </div>
                  {error && (
                    <p role="alert" className="text-destructive text-sm">
                      {error}
                    </p>
                  )}
                  <Button type="submit" disabled={submitting} className="w-full">
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {user ? 'Request quote' : 'Log in to request a quote'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </section>
  );
}
