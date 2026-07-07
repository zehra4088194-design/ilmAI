'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Mail, Lock, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import { OAuthButtons } from '@/components/features/auth/OAuthButtons';
import { toast } from 'sonner';
import { useTranslations } from '@/providers/I18nProvider';

const schema = z.object({ email: z.string().email('Valid email required'), password: z.string().min(6, 'Min 6 characters') });
type FormData = z.infer<typeof schema>;

export function LoginForm() {
  const [showPass, setShowPass] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';
  const supabase = createClient();
  const t = useTranslations();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    const { error } = await supabase.auth.signInWithPassword({ email: data.email, password: data.password });
    if (error) { toast.error(error.message === 'Invalid login credentials' ? 'Email ya password galat hai' : error.message); return; }
    toast.success('Welcome back!');
    router.push(redirect);
    router.refresh();
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">{t('auth.login.title')}</h1>
        <p className="text-muted-foreground">{t('auth.login.subtitle')}</p>
      </div>
      <OAuthButtons />
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
        <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">{t('auth.login.orEmail')}</span></div>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input {...register('email')} type="email" placeholder={t('auth.login.emailPlaceholder')} className="pl-10" error={errors.email?.message} />
        </div>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input {...register('password')} type={showPass ? 'text' : 'password'} placeholder={t('auth.login.passwordPlaceholder')} className="pl-10 pr-10" error={errors.password?.message} />
          <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-sm text-primary hover:underline">{t('auth.login.forgotPassword')}</Link>
        </div>
        <Button type="submit" variant="gradient" className="w-full" size="lg" loading={isSubmitting}>
          <Zap className="w-4 h-4" /> {t('auth.login.submit')}
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground mt-6">
        {t('auth.login.noAccount')} <Link href="/register" className="text-primary font-medium hover:underline">{t('auth.login.registerLink')}</Link>
      </p>
    </div>
  );
}
