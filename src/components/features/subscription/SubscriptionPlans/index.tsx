'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Building2, Check, Crown, Rocket, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CURRENCY_SYMBOLS } from '@/lib/constants';
import { cn } from '@/lib/utils/cn';
import { toast } from 'sonner';
import { DEFAULT_PLATFORM_SETTINGS, type PlatformSettings } from '@/lib/platform-settings/shared';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type BillingCycle = 'monthly' | 'annual';
type PaymentAvailability = { paddleConfigured: boolean; payproConfigured: boolean; automatedAvailable: boolean };
type TierKey = 'FREE' | 'PRO' | 'ELITE';
type InstitutionType = 'school' | 'college';
type InstitutionPlan = 'PRO' | 'ELITE';
const PLAN_KEYS: TierKey[] = ['FREE', 'PRO', 'ELITE'];

export function SubscriptionPlans({
  currentTier,
  paymentAvailability: _paymentAvailability,
  settings = DEFAULT_PLATFORM_SETTINGS,
}: {
  currentTier: string;
  paymentAvailability: PaymentAvailability;
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
  const symbol = CURRENCY_SYMBOLS.PKR;
  const free = settings.subscriptionPlans.FREE;
  const pro = settings.subscriptionPlans.PRO;
  const elite = settings.subscriptionPlans.ELITE;
  const institutionCount = Math.max(0, Number(studentCount) || 0);
  const institutionBasePrice =
    settings.subscriptionPlans[institutionPlan].price.PKR[billingCycle === 'annual' ? 'annual' : 'monthly'];
  const institutionDiscountedPrice = Math.round(institutionBasePrice * institutionCount * 0.5);

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast.success('Payment receive ho gayi. Plan sync ho raha hai.');
    } else if (searchParams.get('canceled') === 'true') {
      toast.info('Checkout cancel ho gaya.');
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
      toast.error('School/college ka naam aur students ki tadaad enter karein');
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
      if (!response.ok) throw new Error(json.error || 'Inquiry send nahi hui');
      toast.success('School/college inquiry admin ko send ho gayi');
      window.sessionStorage.removeItem('ilm-ai-institution-inquiry-draft');
      setInstitutionMessage('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Inquiry send nahi hui');
    } finally {
      setInquiryLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-violet-500/25 bg-violet-500/10 p-4 text-sm">
        <p className="font-semibold">Upgrade se AI limits unlock hoti hain</p>
        <p className="text-muted-foreground mt-2">
          Free: side chat {free.limits.aiSideChatDaily}/day, AI tools/testing {free.limits.aiToolDaily}/day. Pro: har AI
          tool {pro.limits.aiToolDaily}/day. Elite: har AI tool {elite.limits.aiToolDaily}/day. Live Voice coming soon.
        </p>
      </div>

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
          const pricing = plan.price.PKR;
          const displayPrice = billingCycle === 'annual' && !isFree ? pricing.annual : pricing.monthly;
          const priceSuffix = billingCycle === 'annual' && !isFree ? '/year' : '/mo';
          const monthlyEquivalent = billingCycle === 'annual' && !isFree ? Math.round(pricing.annual / 12) : null;
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
                    {displayPrice.toLocaleString()}
                    <span className="text-muted-foreground text-sm font-normal">{priceSuffix}</span>
                  </p>
                  {monthlyEquivalent !== null && (
                    <p className="text-muted-foreground mt-1 text-sm">
                      {symbol}
                      {monthlyEquivalent.toLocaleString()}/mo effective
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
                ) : (
                  <Button asChild className="w-full" variant="gradient">
                    <Link href={`/subscription/${key.toLowerCase()}?billing=${billingCycle}`}>
                      {key === 'PRO' ? 'Go to Pro' : 'Go Elite'}
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

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
                {institutionDiscountedPrice.toLocaleString()}
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
    </div>
  );
}
