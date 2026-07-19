'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Building2, Check, Crown, MessageCircle, Percent, Rocket, School, Sparkles, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils/cn';
import { useTranslations, useMessages } from '@/providers/I18nProvider';
import { CURRENCY_SYMBOLS, type Currency } from '@/lib/constants';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';

const PLAN_IDS = ['free', 'pro', 'elite'] as const;
const PLAN_KEYS = { free: 'FREE', pro: 'PRO', elite: 'ELITE' } as const;
const PLAN_META: Record<
  (typeof PLAN_IDS)[number],
  { color: string; href: string; variant: 'outline' | 'gradient' | 'default'; icon: typeof Sparkles }
> = {
  free: { color: 'from-slate-500 to-gray-600', href: '/register', variant: 'outline', icon: Sparkles },
  pro: { color: 'from-violet-500 to-indigo-600', href: '/register?plan=pro', variant: 'gradient', icon: Rocket },
  elite: { color: 'from-amber-500 to-orange-600', href: '/register?plan=elite', variant: 'default', icon: Crown },
};

type PricingAudience = 'students' | 'institutions';
type InstitutionType = 'school' | 'college';
type InstitutionPlan = 'PRO' | 'ELITE';

export function PricingSection({ currency }: { currency: Currency }) {
  const [audience, setAudience] = useState<PricingAudience>('students');
  const [isAnnual, setIsAnnual] = useState(false);
  const [institutionType, setInstitutionType] = useState<InstitutionType>('school');
  const [institutionPlan, setInstitutionPlan] = useState<InstitutionPlan>('PRO');
  const [studentCount, setStudentCount] = useState('50');
  const [institutionName, setInstitutionName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSendingInquiry, setIsSendingInquiry] = useState(false);
  const router = useRouter();
  const t = useTranslations();
  const messages = useMessages();
  const plans = messages.pricing.plans;
  const symbol = CURRENCY_SYMBOLS[currency];
  const settings = usePlatformSettings();
  const billingCycle = isAnnual ? 'annual' : 'monthly';
  const institutionCount = Math.min(100000, Math.max(0, Math.floor(Number(studentCount) || 0)));
  const institutionPerStudent = settings.subscriptionPlans[institutionPlan].price[currency][billingCycle];
  const institutionListPrice = institutionPerStudent * institutionCount;
  const institutionDiscountedPrice = institutionListPrice * 0.5;

  const submitInstitutionInquiry = async () => {
    if (!institutionName.trim() || institutionCount < 1) {
      toast.error('School/college ka naam aur students ki valid tadaad likhein');
      return;
    }
    if (contactEmail && !/^\S+@\S+\.\S+$/.test(contactEmail)) {
      toast.error('Valid contact email likhein');
      return;
    }

    const draft = {
      institutionName: institutionName.trim(),
      institutionType,
      studentCount: institutionCount,
      planTier: institutionPlan,
      billingCycle,
      contactName: contactName.trim(),
      contactEmail: contactEmail.trim(),
      message: message.trim(),
    };

    setIsSendingInquiry(true);
    try {
      const response = await fetch('/api/institution-plan-inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const json = await response.json().catch(() => ({}));

      if (response.status === 401) {
        window.sessionStorage.setItem('ilm-ai-institution-inquiry-draft', JSON.stringify(draft));
        toast.info('Please log in first to save the inquiry and contact the admin team.');
        router.push(`/login?redirect=${encodeURIComponent('/subscription#institution-plans')}`);
        return;
      }
      if (!response.ok) throw new Error(json.error || 'The inquiry could not be sent.');

      toast.success('The inquiry was sent to the admin team and added to the dedicated inbox.');
      setMessage('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The inquiry could not be sent.');
    } finally {
      setIsSendingInquiry(false);
    }
  };

  return (
    <section id="pricing" className="py-24">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 text-center"
        >
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">
            {t('pricing.title1')}
            <span className="gradient-text">{t('pricing.titleHighlight')}</span>
            {t('pricing.titleSuffix')}
          </h2>
          <p className="text-muted-foreground mb-8">{t('pricing.subtitle')}</p>

          <div className="glass mb-5 inline-grid grid-cols-2 gap-1 rounded-full p-1.5">
            <button
              type="button"
              onClick={() => setAudience('students')}
              className={cn(
                'flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all sm:px-6',
                audience === 'students' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground'
              )}
            >
              <GraduationAudienceIcon /> Students
            </button>
            <button
              type="button"
              onClick={() => setAudience('institutions')}
              className={cn(
                'flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all sm:px-6',
                audience === 'institutions' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground'
              )}
            >
              <Building2 className="h-4 w-4" /> Schools & Colleges
            </button>
          </div>

          <div className="glass inline-flex items-center gap-3 rounded-full p-1.5">
            <button
              type="button"
              onClick={() => setIsAnnual(false)}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-medium transition-all',
                !isAnnual ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
              )}
            >
              {t('pricing.monthly')}
            </button>
            <button
              type="button"
              onClick={() => setIsAnnual(true)}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-medium transition-all',
                isAnnual ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
              )}
            >
              {t('pricing.annual')}{' '}
              <Badge variant="success" className="ml-1 text-xs">
                {t('pricing.save20')}
              </Badge>
            </button>
          </div>
        </motion.div>

        {audience === 'students' ? (
          <>
            <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
              {PLAN_IDS.map((id, index) => {
                const plan = plans[id];
                const meta = PLAN_META[id];
                const Icon = meta.icon;
                const dynamicPlan = settings.subscriptionPlans[PLAN_KEYS[id]];
                const planPrice = dynamicPlan.price[currency];
                const monthly = planPrice.monthly;
                const annual = planPrice.annual;
                const annualPerMonth = monthly > 0 ? annual / 12 : 0;
                const displayPrice = isAnnual ? annual : monthly;
                const suffix = isAnnual && monthly > 0 ? '/year' : monthly > 0 ? t('pricing.perMonth') : '';

                return (
                  <motion.div
                    key={id}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className={cn(
                      'glass relative rounded-2xl border p-6 transition-all duration-300',
                      id === 'pro'
                        ? 'scale-105 border-violet-500/50 shadow-lg shadow-violet-500/10'
                        : 'border-border/50 hover:border-violet-500/30'
                    )}
                  >
                    {plan.badge && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge variant="default" className="bg-violet-600 px-3 text-white">
                          {plan.badge}
                        </Badge>
                      </div>
                    )}
                    {isAnnual && id !== 'free' && (
                      <div className="absolute top-4 right-4">
                        <Badge
                          className={cn(
                            'rounded-full border-0 px-3 py-1 text-[11px] font-semibold tracking-[0.18em] text-white uppercase shadow-lg',
                            id === 'elite'
                              ? 'bg-gradient-to-r from-amber-500 to-orange-600'
                              : 'bg-gradient-to-r from-violet-500 to-indigo-600'
                          )}
                        >
                          20% Off
                        </Badge>
                      </div>
                    )}
                    <div
                      className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${meta.color} shadow-lg`}
                    >
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="mb-2 text-xl font-bold">{plan.name}</h3>
                    <div className="mb-6">
                      <span className="text-4xl font-bold">
                        {symbol}
                        {formatPrice(displayPrice, currency)}
                      </span>
                      {monthly > 0 && <span className="text-muted-foreground text-sm">{suffix}</span>}
                      {isAnnual && monthly > 0 && (
                        <p className="text-muted-foreground mt-1 text-xs">
                          {symbol}
                          {formatPrice(annualPerMonth, currency)}/mo effective
                        </p>
                      )}
                    </div>
                    <ul className="mb-8 space-y-3">
                      {(dynamicPlan.features.length ? dynamicPlan.features : plan.features).map(
                        (feature: string, featureIndex: number) => (
                          <li key={featureIndex} className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4 shrink-0 text-green-500" />
                            {feature}
                          </li>
                        )
                      )}
                    </ul>
                    <Button asChild variant={meta.variant} className="w-full">
                      <Link
                        href={
                          id === 'free'
                            ? meta.href
                            : `/register?redirect=${encodeURIComponent(`/subscription/${id}?billing=${billingCycle}`)}`
                        }
                      >
                        <Zap className="h-4 w-4" />
                        {id === 'free' ? plan.cta : 'Checkout'}
                      </Link>
                    </Button>
                  </motion.div>
                );
              })}
            </div>

            <div className="text-muted-foreground mx-auto mt-8 max-w-4xl rounded-2xl border border-violet-500/30 bg-violet-500/10 p-4 text-center text-sm">
              After you choose a plan, clear payment instructions will appear on the next page.
            </div>
          </>
        ) : (
          <motion.div
            key="institution-pricing"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass mx-auto grid max-w-6xl overflow-hidden border lg:grid-cols-[0.8fr_1.2fr]"
          >
            <div className="from-primary/20 via-primary/5 border-border relative overflow-hidden border-b bg-gradient-to-br to-transparent p-7 lg:border-r lg:border-b-0 lg:p-10">
              <div className="bg-primary/10 text-primary mb-6 flex h-14 w-14 items-center justify-center rounded-2xl">
                {institutionType === 'school' ? <School className="h-7 w-7" /> : <Building2 className="h-7 w-7" />}
              </div>
              <Badge className="mb-4 bg-emerald-500 text-white">
                <Percent className="mr-1 h-3.5 w-3.5" /> 50% Institutional Discount
              </Badge>
              <h3 className="text-3xl font-bold">One plan for your whole campus</h3>
              <p className="text-muted-foreground mt-4 leading-7">
                Students ki tadaad select karein, discounted total foran dekhein, phir request seedha ilm AI admin team
                ko bhejein.
              </p>
              <div className="mt-8 space-y-4 text-sm">
                <p className="flex items-start gap-3">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> Har selected student ko Pro ya Elite
                  access
                </p>
                <p className="flex items-start gap-3">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> Dedicated institution usage reporting
                </p>
                <p className="flex items-start gap-3">
                  <MessageCircle className="text-primary mt-0.5 h-4 w-4 shrink-0" /> Request ke baad direct admin
                  follow-up
                </p>
              </div>
            </div>

            <div className="p-7 lg:p-10">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="pricing-institution-type" className="mb-2 block text-sm font-medium">
                    Institution type
                  </label>
                  <select
                    id="pricing-institution-type"
                    value={institutionType}
                    onChange={(event) => setInstitutionType(event.target.value as InstitutionType)}
                    className="border-input bg-background h-10 w-full rounded-lg border px-3 text-sm"
                  >
                    <option value="school">School</option>
                    <option value="college">College</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="pricing-institution-plan" className="mb-2 block text-sm font-medium">
                    Plan for every student
                  </label>
                  <select
                    id="pricing-institution-plan"
                    value={institutionPlan}
                    onChange={(event) => setInstitutionPlan(event.target.value as InstitutionPlan)}
                    className="border-input bg-background h-10 w-full rounded-lg border px-3 text-sm"
                  >
                    <option value="PRO">Pro</option>
                    <option value="ELITE">Elite</option>
                  </select>
                </div>
              </div>

              <div className="mt-5">
                <label htmlFor="pricing-student-count" className="mb-2 block text-sm font-medium">
                  Number of students
                </label>
                <Input
                  id="pricing-student-count"
                  type="number"
                  min={1}
                  max={100000}
                  step={1}
                  value={studentCount}
                  onChange={(event) => setStudentCount(event.target.value)}
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  {[25, 50, 100, 250, 500].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setStudentCount(String(count))}
                      className={cn(
                        'rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
                        institutionCount === count
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-primary/25 from-primary/10 to-accent/10 mt-6 rounded-2xl border bg-gradient-to-r p-5">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                      Your 50% total
                    </p>
                    <p className="text-primary mt-1 text-3xl font-bold">
                      {symbol}
                      {formatPrice(institutionDiscountedPrice, currency)}
                      <span className="text-muted-foreground ml-1 text-sm font-normal">
                        /{isAnnual ? 'year' : 'month'}
                      </span>
                    </p>
                  </div>
                  <div className="text-right text-xs">
                    <p className="text-muted-foreground line-through">
                      {symbol}
                      {formatPrice(institutionListPrice, currency)}
                    </p>
                    <p className="font-semibold text-emerald-500">
                      Save {symbol}
                      {formatPrice(institutionListPrice - institutionDiscountedPrice, currency)}
                    </p>
                  </div>
                </div>
                <p className="text-muted-foreground mt-3 text-xs">
                  {symbol}
                  {formatPrice(institutionPerStudent * 0.5, currency)} per student, {billingCycle}.
                </p>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Input
                  value={institutionName}
                  onChange={(event) => setInstitutionName(event.target.value)}
                  autoComplete="organization"
                  placeholder={`${institutionType === 'school' ? 'School' : 'College'} name`}
                />
                <Input
                  value={contactName}
                  onChange={(event) => setContactName(event.target.value)}
                  autoComplete="name"
                  placeholder="Contact person name"
                />
                <Input
                  type="email"
                  value={contactEmail}
                  onChange={(event) => setContactEmail(event.target.value)}
                  autoComplete="email"
                  placeholder="Contact email"
                />
                <Input
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Message or preferred contact time"
                />
              </div>

              <Button
                type="button"
                variant="gradient"
                size="lg"
                className="mt-5 w-full"
                onClick={submitInstitutionInquiry}
                loading={isSendingInquiry}
              >
                <MessageCircle className="h-4 w-4" /> Send request to admin
              </Button>
              <p className="text-muted-foreground mt-3 text-center text-xs">
                Login na ho to form safely preserve karke login par le jayega.
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
}

function GraduationAudienceIcon() {
  return <Sparkles className="h-4 w-4" />;
}

function formatPrice(value: number, currency: Currency) {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: currency === 'USD' ? 2 : 0,
    maximumFractionDigits: currency === 'USD' ? 2 : 0,
  });
}
