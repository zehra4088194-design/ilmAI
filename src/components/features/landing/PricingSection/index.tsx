'use client';
import { motion } from 'framer-motion';
import { Check, Crown, Rocket, Sparkles, Zap } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { useTranslations, useMessages } from '@/providers/I18nProvider';
import { useAuth } from '@/hooks/auth/useAuth';
import { SUBSCRIPTION_PLANS, CURRENCY_SYMBOLS, getCurrencyForBoard, getCurrencyForCountry, type Currency } from '@/lib/constants';

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
  const { user } = useAuth();

  // Prefer the logged-in student's board (set once at signup, reliable)
  // over IP geolocation. Anonymous/pre-signup visitors fall back to
  // /api/geo. Defaults to PKR while resolving, matching the app's
  // Pakistan-first default.
  const [currency, setCurrency] = useState<Currency>('PKR');

  useEffect(() => {
    if (user?.board) {
      setCurrency(getCurrencyForBoard(user.board));
      return;
    }
    fetch('/api/geo')
      .then((r) => r.json())
      .then((json) => setCurrency(getCurrencyForCountry(json?.country)))
      .catch(() => {});
  }, [user?.board]);

  const symbol = CURRENCY_SYMBOLS[currency];

  return (
    <section id="pricing" className="py-24">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t('pricing.title1')}<span className="gradient-text">{t('pricing.titleHighlight')}</span>{t('pricing.titleSuffix')}
          </h2>
          <p className="text-muted-foreground mb-8">{t('pricing.subtitle')}</p>
          <div className="inline-flex items-center gap-3 glass rounded-full p-1.5 border border-border">
            <button onClick={() => setIsAnnual(false)} className={cn('px-4 py-2 rounded-full text-sm font-medium transition-all', !isAnnual ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>{t('pricing.monthly')}</button>
            <button onClick={() => setIsAnnual(true)} className={cn('px-4 py-2 rounded-full text-sm font-medium transition-all', isAnnual ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>
              {t('pricing.annual')} <Badge variant="success" className="ml-1 text-xs">{t('pricing.save20')}</Badge>
            </button>
          </div>
        </motion.div>
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {PLAN_IDS.map((id, i) => {
            const plan = plans[id];
            const meta = PLAN_META[id];
            const Icon = meta.icon;
            const planPrice = SUBSCRIPTION_PLANS[PLAN_KEYS[id]].price[currency];
            // Annual is stored as a full-year total; show the discounted
            // per-month equivalent when the "annual" toggle is active.
            const monthly = planPrice.monthly;
            const annualPerMonth = Math.round(planPrice.annual / 12);
            const displayPrice = isAnnual ? annualPerMonth : monthly;
            return (
              <motion.div key={id} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className={cn('glass rounded-2xl p-6 border transition-all duration-300 relative', id === 'pro' ? 'border-violet-500/50 shadow-lg shadow-violet-500/10 scale-105' : 'border-border/50 hover:border-violet-500/30')}>
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge variant="default" className="bg-violet-600 text-white px-3">{plan.badge}</Badge>
                  </div>
                )}
                {isAnnual && id !== 'free' && (
                  <div className="absolute right-4 top-4">
                    <Badge className={cn(
                      'rounded-full border-0 px-3 py-1 text-[11px] font-semibold tracking-[0.18em] uppercase text-white shadow-lg',
                      id === 'elite'
                        ? 'bg-gradient-to-r from-amber-500 to-orange-600'
                        : 'bg-gradient-to-r from-violet-500 to-indigo-600'
                    )}>
                      20% Off
                    </Badge>
                  </div>
                )}
                <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${meta.color} shadow-lg`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold">{symbol}{displayPrice}</span>
                  {monthly > 0 && <span className="text-muted-foreground text-sm">{t('pricing.perMonth')}</span>}
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f: string, fi: number) => (
                    <li key={fi} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 shrink-0" />{f}
                    </li>
                  ))}
                </ul>
                <Button asChild variant={meta.variant} className="w-full">
                  <Link href={meta.href}><Zap className="w-4 h-4" />{plan.cta}</Link>
                </Button>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
