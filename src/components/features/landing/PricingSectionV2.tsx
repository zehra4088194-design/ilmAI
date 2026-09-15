'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2, Check, Crown, MessageCircle, Percent, Rocket, School, Sparkles, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils/cn';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { convertUsdToPkr } from '@/lib/platform-settings/shared';
import { TRANSACTION_FEE_USD } from '@/lib/constants';
import { formatPkr } from '@/lib/pricing/display';

type Audience = 'students' | 'institutions';
type InstitutionType = 'school' | 'college';
type Billing = 'monthly' | 'annual';
const PLAN_KEYS = ['FREE', 'PRO', 'ELITE'] as const;

export function PricingSectionV2() {
  const settings = usePlatformSettings();
  const router = useRouter();
  const [audience, setAudience] = useState<Audience>('students');
  const [billing, setBilling] = useState<Billing>('monthly');
  const [institutionType, setInstitutionType] = useState<InstitutionType>('school');
  const [institutionPlan, setInstitutionPlan] = useState<'PRO' | 'ELITE'>('PRO');
  const [studentCount, setStudentCount] = useState('50');
  const [institutionName, setInstitutionName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSendingInquiry, setIsSendingInquiry] = useState(false);
  const institutionCount = Math.min(100000, Math.max(1, Math.floor(Number(studentCount) || 1)));

  const submitInstitutionInquiry = async () => {
    if (!institutionName.trim()) return toast.error('Enter the institution name.');
    if (contactEmail && !/^\S+@\S+\.\S+$/.test(contactEmail)) return toast.error('Valid contact email likhein.');
    const draft = { institutionName: institutionName.trim(), institutionType, studentCount: institutionCount, planTier: institutionPlan, billingCycle: billing, contactName: contactName.trim(), contactEmail: contactEmail.trim(), message: message.trim() };
    setIsSendingInquiry(true);
    try {
      const response = await fetch('/api/institution-plan-inquiry', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) });
      const json = await response.json().catch(() => ({}));
      if (response.status === 401) {
        window.sessionStorage.setItem('ilm-ai-institution-inquiry-draft', JSON.stringify(draft));
        router.push(`/login?redirect=${encodeURIComponent('/pricing#pricing')}`);
        return;
      }
      if (!response.ok) throw new Error(json.error || 'The inquiry could not be sent.');
      toast.success('Request sent to the admin team.');
      setMessage('');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'The inquiry could not be sent.'); }
    finally { setIsSendingInquiry(false); }
  };

  return (
    <section id="pricing" className="py-24">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">Simple <span className="gradient-text">pricing</span> for ilm AI</h2>
          <p className="text-muted-foreground mb-8">USD is the primary price. The smaller amount below is the live PKR equivalent.</p>
          <div className="glass mb-4 inline-grid grid-cols-2 gap-1 rounded-full p-1.5">
            {(['students', 'institutions'] as Audience[]).map((item) => <button key={item} type="button" onClick={() => setAudience(item)} className={cn('rounded-full px-5 py-2 text-sm font-semibold', audience === item ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>{item === 'students' ? <><Sparkles className="mr-2 inline h-4 w-4" />Students</> : <><Building2 className="mr-2 inline h-4 w-4" />Schools & Colleges</>}</button>)}
          </div>
          <div className="glass inline-flex gap-1 rounded-full p-1.5">
            <button type="button" onClick={() => setBilling('monthly')} className={cn('rounded-full px-4 py-2 text-sm font-medium', billing === 'monthly' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>Monthly</button>
            <button type="button" onClick={() => setBilling('annual')} className={cn('rounded-full px-4 py-2 text-sm font-medium', billing === 'annual' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>Yearly <Badge variant="success" className="ml-1 text-[10px]">20% Off</Badge></button>
          </div>
        </div>

        {audience === 'students' ? <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
          {PLAN_KEYS.map((key) => {
            const plan = settings.subscriptionPlans[key];
            if (!plan.enabled) return null;
            const isFree = key === 'FREE';
            const usd = billing === 'annual' && !isFree ? plan.price.USD.annual : plan.price.USD.monthly;
            const pkr = convertUsdToPkr(usd, settings);
            const suffix = isFree ? '' : billing === 'annual' ? '/year' : '/mo';
            const Icon = key === 'FREE' ? Sparkles : key === 'PRO' ? Rocket : Crown;
            return <div key={key} className={cn('glass rounded-2xl border p-6', key === 'PRO' && 'scale-[1.02] border-violet-500/50 shadow-lg')}>
              <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${key === 'ELITE' ? 'from-amber-500 to-orange-600' : key === 'PRO' ? 'from-violet-500 to-indigo-600' : 'from-slate-500 to-gray-600'}`}><Icon className="h-5 w-5 text-white" /></div>
              <h3 className="mb-1 text-xl font-bold">{plan.name}</h3>
              <p className="text-4xl font-black">${usd.toFixed(2)}<span className="text-muted-foreground text-sm font-normal">{suffix}</span></p>
              <p className="text-muted-foreground mt-1 text-sm">= Rs {formatPkr(pkr)}{suffix}</p>
              {!isFree && <p className="text-muted-foreground mt-1 text-xs">+${TRANSACTION_FEE_USD.toFixed(2)} transaction fee</p>}
              <ul className="my-6 space-y-3">{plan.features.map((feature) => <li key={feature} className="flex gap-2 text-sm"><Check className="h-4 w-4 shrink-0 text-green-500" />{feature}</li>)}</ul>
              <Button asChild className="w-full" variant={isFree ? 'outline' : 'gradient'}><Link href={isFree ? '/register' : `/register?redirect=${encodeURIComponent(`/subscription/${key.toLowerCase()}?billing=${billing}`)}`}><Zap className="h-4 w-4" />{isFree ? 'Get started' : `Choose ${plan.name}`}</Link></Button>
            </div>;
          })}
        </div> : <div className="glass mx-auto grid max-w-6xl overflow-hidden border lg:grid-cols-[0.8fr_1.2fr]">
          <div className="border-border bg-gradient-to-br from-primary/20 via-primary/5 to-transparent border-b p-7 lg:border-r lg:border-b-0 lg:p-10">
            <div className="bg-primary/10 text-primary mb-6 flex h-14 w-14 items-center justify-center rounded-2xl">{institutionType === 'school' ? <School className="h-7 w-7" /> : <Building2 className="h-7 w-7" />}</div>
            <Badge className="mb-4 bg-emerald-500 text-white"><Percent className="mr-1 h-3.5 w-3.5" />50% Institutional Discount</Badge>
            <h3 className="text-3xl font-bold">One plan for your whole campus</h3>
            <p className="text-muted-foreground mt-4 leading-7">Choose the institution type, plan, and number of students. The total is always displayed in USD first with PKR underneath.</p>
          </div>
          <div className="p-7 lg:p-10">
            <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Institution type<select value={institutionType} onChange={(e) => setInstitutionType(e.target.value as InstitutionType)} className="border-input bg-background mt-2 h-10 w-full rounded-lg border px-3 text-sm"><option value="school">School</option><option value="college">College</option></select></label><label className="text-sm font-medium">Plan<select value={institutionPlan} onChange={(e) => setInstitutionPlan(e.target.value as 'PRO' | 'ELITE')} className="border-input bg-background mt-2 h-10 w-full rounded-lg border px-3 text-sm"><option value="PRO">Pro</option><option value="ELITE">Elite</option></select></label></div>
            <label className="mt-5 block text-sm font-medium">Number of students<Input className="mt-2" type="number" min={1} max={100000} value={studentCount} onChange={(e) => setStudentCount(e.target.value)} /></label>
            <div className="border-primary/25 bg-primary/10 mt-5 rounded-2xl border p-5">{(() => { const usdPerStudent = settings.subscriptionPlans[institutionPlan].price.USD[billing]; const totalUsd = usdPerStudent * institutionCount * 0.5; return <><p className="text-muted-foreground text-xs font-semibold uppercase">50% discounted total</p><p className="mt-1 text-3xl font-black">${totalUsd.toFixed(2)}<span className="text-muted-foreground text-sm font-normal">/{billing === 'annual' ? 'year' : 'month'}</span></p><p className="text-muted-foreground mt-1 text-sm">= Rs {formatPkr(convertUsdToPkr(totalUsd, settings))}/{billing === 'annual' ? 'year' : 'month'}</p></>; })()}</div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2"><Input value={institutionName} onChange={(e) => setInstitutionName(e.target.value)} placeholder="School / college name" /><Input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Contact person" /><Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="Contact email" /><Input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Message or preferred contact time" /></div>
            <Button type="button" className="mt-5 w-full" variant="gradient" loading={isSendingInquiry} onClick={submitInstitutionInquiry}><MessageCircle className="h-4 w-4" />Send request to admin</Button>
          </div>
        </div>}
      </div>
    </section>
  );
}
