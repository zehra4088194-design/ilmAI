'use client';
import { motion } from 'framer-motion';
import { Check, Zap } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { cn } from '@/lib/utils/cn';

const PLANS = [
  { name: 'Free', price: { monthly: 0, annual: 0 }, color: 'from-slate-500 to-gray-600', badge: null,
    features: ['10 AI messages/day', '5 quizzes/day', '50 flashcards', 'Basic progress', 'Community access'],
    cta: 'Start Free', href: '/register', variant: 'outline' as const },
  { name: 'Pro', price: { monthly: 499, annual: 399 }, color: 'from-violet-500 to-indigo-600', badge: 'Most Popular',
    features: ['100 AI messages/day', 'Unlimited quizzes', '1,000 flashcards', 'All past papers', 'PDF downloads', 'Priority support', 'Progress analytics'],
    cta: 'Start Pro', href: '/register?plan=pro', variant: 'gradient' as const },
  { name: 'Elite', price: { monthly: 999, annual: 799 }, color: 'from-amber-500 to-orange-600', badge: 'Best Value',
    features: ['Unlimited AI messages', 'Unlimited everything', 'Offline mode', 'Parent dashboard', 'Exam simulations', '1-on-1 AI sessions', 'Custom study plans'],
    cta: 'Go Elite', href: '/register?plan=elite', variant: 'default' as const },
];

export function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(false);
  return (
    <section id="pricing" className="py-24">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, <span className="gradient-text">Affordable</span> Pricing</h2>
          <p className="text-muted-foreground mb-8">Pakistani students ke budget ke hisaab se plans</p>
          <div className="inline-flex items-center gap-3 glass rounded-full p-1.5 border border-border">
            <button onClick={() => setIsAnnual(false)} className={cn('px-4 py-2 rounded-full text-sm font-medium transition-all', !isAnnual ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>Monthly</button>
            <button onClick={() => setIsAnnual(true)} className={cn('px-4 py-2 rounded-full text-sm font-medium transition-all', isAnnual ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>
              Annual <Badge variant="success" className="ml-1 text-xs">Save 20%</Badge>
            </button>
          </div>
        </motion.div>
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {PLANS.map((plan, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className={cn('glass rounded-2xl p-6 border transition-all duration-300 relative', plan.badge === 'Most Popular' ? 'border-violet-500/50 shadow-lg shadow-violet-500/10 scale-105' : 'border-border/50 hover:border-violet-500/30')}>
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge variant="default" className="bg-violet-600 text-white px-3">{plan.badge}</Badge>
                </div>
              )}
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${plan.color} mb-4`} />
              <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold">Rs.{isAnnual ? plan.price.annual : plan.price.monthly}</span>
                {plan.price.monthly > 0 && <span className="text-muted-foreground text-sm">/month</span>}
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((f, fi) => (
                  <li key={fi} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500 shrink-0" />{f}
                  </li>
                ))}
              </ul>
              <Button asChild variant={plan.variant} className="w-full">
                <Link href={plan.href}><Zap className="w-4 h-4" />{plan.cta}</Link>
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
