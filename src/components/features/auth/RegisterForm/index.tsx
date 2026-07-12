'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Mail, Lock, User, Zap, GraduationCap, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import { OAuthButtons } from '@/components/features/auth/OAuthButtons';
import { BOARDS, COUNTRY_BOARD_DEFAULTS } from '@/lib/constants';
import { cn } from '@/lib/utils/cn';
import { toast } from 'sonner';
import { useTranslations } from '@/providers/I18nProvider';

const schema = z.object({
  fullName: z.string().min(2, 'Min 2 characters'),
  email: z.string().email('Valid email required'),
  password: z.string().min(8, 'Min 8 characters'),
  confirmPassword: z.string(),
  board: z.string().optional(),
}).refine(d => d.password === d.confirmPassword, { message: 'Passwords match nahi karte', path: ['confirmPassword'] });
type FormData = z.infer<typeof schema>;

export function RegisterForm() {
  const [showPass, setShowPass] = useState(false);
  const [accountType, setAccountType] = useState<'student' | 'parent'>('student');
  const [detectedCountry, setDetectedCountry] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();
  const t = useTranslations();
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    fetch('/api/geo')
      .then((r) => r.json())
      .then((json) => {
        const country = json?.country as string | undefined;
        if (country && COUNTRY_BOARD_DEFAULTS[country]) {
          setDetectedCountry(country);
          setValue('board', COUNTRY_BOARD_DEFAULTS[country]);
        }
      })
      .catch(() => {});
  }, [setValue]);

  const onSubmit = async (data: FormData) => {
  if (accountType === 'student' && !data.board) {
    toast.error('Apna board select karo');
    return;
  }

  const { error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        full_name: data.fullName,
        role: accountType,
        board: accountType === 'student' ? data.board : undefined,
      },
      emailRedirectTo: `${window.location.origin}/api/auth/callback`,
    },
  });
  if (error) { toast.error(error.message); return; }

  toast.success('Account ban gaya! Email check karo.');
  router.push('/verify-email');
};

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">{t('auth.register.title')}</h1>
        <p className="text-muted-foreground">{t('auth.register.subtitle')}</p>
      </div>

      {/* Account type toggle */}
      <div className="grid grid-cols-2 gap-2 mb-6">
        <button type="button" onClick={() => setAccountType('student')}
          className={cn('flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all', accountType === 'student' ? 'border-violet-500 bg-violet-500/20 shadow-sm shadow-violet-500/15' : 'border-border bg-card/80 hover:border-violet-500/40 hover:bg-violet-500/10')}>
          <GraduationCap className={cn('w-5 h-5', accountType === 'student' ? 'text-violet-400' : 'text-muted-foreground')} />
          <span className="text-xs font-medium">{t('auth.register.student')}</span>
        </button>
        <button type="button" onClick={() => setAccountType('parent')}
          className={cn('flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all', accountType === 'parent' ? 'border-violet-500 bg-violet-500/20 shadow-sm shadow-violet-500/15' : 'border-border bg-card/80 hover:border-violet-500/40 hover:bg-violet-500/10')}>
          <Users className={cn('w-5 h-5', accountType === 'parent' ? 'text-violet-400' : 'text-muted-foreground')} />
          <span className="text-xs font-medium">{t('auth.register.parent')}</span>
        </button>
      </div>

      <OAuthButtons action="Register" role={accountType} />
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
        <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">{t('auth.register.orEmail')}</span></div>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input {...register('fullName')} placeholder={t('auth.register.fullNamePlaceholder')} className="pl-10" error={errors.fullName?.message} />
        </div>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input {...register('email')} type="email" placeholder={t('auth.register.emailPlaceholder')} className="pl-10" error={errors.email?.message} />
        </div>

        {accountType === 'student' && (
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">{t('auth.register.boardLabel')}</label>
              <select {...register('board')} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" defaultValue="">
                <option value="" disabled>{t('auth.register.boardPlaceholder')}</option>
                {BOARDS.filter(b => b.value !== 'OTHER').map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
                <option value="OTHER">Other</option>
              </select>
            </div>
            <p className="text-xs text-muted-foreground -mt-1">
              {detectedCountry === 'IN' ? 'India detect hui - CBSE default select ho gaya hai.' : detectedCountry === 'PK' ? 'Pakistan detect hua - FBISE default select ho gaya hai.' : ''}
              {' '}Class onboarding ke next step mein poochi jayegi.
            </p>
          </div>
        )}

        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input {...register('password')} type={showPass ? 'text' : 'password'} placeholder={t('auth.register.passwordPlaceholder')} className="pl-10 pr-10" error={errors.password?.message} />
          <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <Input {...register('confirmPassword')} type="password" placeholder={t('auth.register.confirmPasswordPlaceholder')} error={errors.confirmPassword?.message} />
        <Button type="submit" variant="gradient" className="w-full" size="lg" loading={isSubmitting}>
          <Zap className="w-4 h-4" /> {accountType === 'parent' ? t('auth.register.submitParent') : t('auth.register.submitStudent')}
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground mt-6">
        {t('auth.register.haveAccount')} <Link href="/login" className="text-primary font-medium hover:underline">{t('auth.register.loginLink')}</Link>
      </p>
    </div>
  );
}
