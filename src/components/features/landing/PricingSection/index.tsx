'use client';
import { motion } from 'framer-motion';
import { Check, Crown, Rocket, Sparkles, Zap } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { useTranslations, useMessages } from '@/providers/I18nProvider';
import { CURRENCY_SYMBOLS, MANUAL_PAYMENT_OPTIONS, SUBSCRIPTION_PLANS } from '@/lib/constants';

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

export function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(false);
  const t = useTranslations();
  const messages = useMessages();
  const plans = messages.pricing.plans;
  const symbol = CURRENCY_SYMBOLS.PKR;

  return (
    <section id="pricing" className="py-24">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">
            {t('pricing.title1')}
            <span className="gradient-text">{t('pricing.titleHighlight')}</span>
            {t('pricing.titleSuffix')}
          </h2>
          <p className="mb-8 text-muted-foreground">{t('pricing.subtitle')}</p>
          <div className="glass inline-flex items-center gap-3 rounded-full border border-border p-1.5">
            <button
              onClick={() => setIsAnnual(false)}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-medium transition-all',
                !isAnnual ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
              )}
            >
              {t('pricing.monthly')}
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-medium transition-all',
                isAnnual ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
              )}
            >
              {t('pricing.annual')} <Badge variant="success" className="ml-1 text-xs">{t('pricing.save20')}</Badge>
            </button>
          </div>
        </motion.div>

        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
          {PLAN_IDS.map((id, i) => {
            const plan = plans[id];
            const meta = PLAN_META[id];
            const Icon = meta.icon;
            const planPrice = SUBSCRIPTION_PLANS[PLAN_KEYS[id]].price.PKR;
            const monthly = planPrice.monthly;
            const annual = planPrice.annual;
            const annualPerMonth = monthly > 0 ? Math.round(annual / 12) : 0;
            const displayPrice = isAnnual ? annual : monthly;
            const suffix = isAnnual && monthly > 0 ? '/year' : monthly > 0 ? t('pricing.perMonth') : '';

            return (
              <motion.div
                key={id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
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
                  <div className="absolute right-4 top-4">
                    <Badge
                      className={cn(
                        'rounded-full border-0 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white shadow-lg',
                        id === 'elite'
                          ? 'bg-gradient-to-r from-amber-500 to-orange-600'
                          : 'bg-gradient-to-r from-violet-500 to-indigo-600'
                      )}
                    >
                      20% Off
                    </Badge>
                  </div>
                )}
                <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${meta.color} shadow-lg`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="mb-2 text-xl font-bold">{plan.name}</h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold">{symbol}{displayPrice.toLocaleString()}</span>
                  {monthly > 0 && <span className="text-sm text-muted-foreground">{suffix}</span>}
                  {isAnnual && monthly > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {symbol}{annualPerMonth.toLocaleString()}/mo effective
                    </p>
                  )}
                </div>
                <ul className="mb-8 space-y-3">
                  {plan.features.map((f: string, fi: number) => (
                    <li key={fi} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 shrink-0 text-green-500" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button asChild variant={meta.variant} className="w-full">
                  <Link href={meta.href}>
                    <Zap className="h-4 w-4" />
                    {plan.cta}
                  </Link>
                </Button>
              </motion.div>
            );
          })}
        </div>

        <div className="mx-auto mt-8 max-w-4xl rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-center text-sm text-amber-100">
          Filhaal sirf manual Pakistan payments available hain: {' '}
          {MANUAL_PAYMENT_OPTIONS.map((option) => `${option.label} ${option.number}`).join(' | ')}. Send the screenshot to
          {' '}zehra4088194@gmail.com and within 1 hour your transaction will be verified.
        </div>
      </div>
    </section>
  );
}
