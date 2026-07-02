'use client';
import { useState } from 'react';
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
import { cn } from '@/lib/utils/cn';
import { toast } from 'sonner';

const schema = z.object({
  fullName: z.string().min(2, 'Min 2 characters'),
  email: z.string().email('Valid email required'),
  password: z.string().min(8, 'Min 8 characters'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, { message: 'Passwords match nahi karte', path: ['confirmPassword'] });
type FormData = z.infer<typeof schema>;

export function RegisterForm() {
  const [showPass, setShowPass] = useState(false);
  const [accountType, setAccountType] = useState<'student' | 'parent'>('student');
  const router = useRouter();
  const supabase = createClient();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    const { data: signUpData, error } = await supabase.auth.signUp({
      email: data.email, password: data.password,
      options: { data: { full_name: data.fullName, role: accountType }, emailRedirectTo: `${window.location.origin}/api/auth/callback` },
    });
    if (error) { toast.error(error.message); return; }

    // Set role on profile (trigger creates it as 'student' by default)
    if (signUpData.user && accountType === 'parent') {
      await supabase.from('profiles').update({ role: 'parent' }).eq('id', signUpData.user.id);
    }

    toast.success('Account ban gaya! Email check karo.');
    router.push('/verify-email');
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">Create Account 🚀</h1>
        <p className="text-muted-foreground">Free mein join karo, 10 AI messages roz milenge!</p>
      </div>

      {/* Account type toggle */}
      <div className="grid grid-cols-2 gap-2 mb-6">
        <button type="button" onClick={() => setAccountType('student')}
          className={cn('flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all', accountType === 'student' ? 'border-violet-500 bg-violet-500/10' : 'border-border hover:border-violet-500/30')}>
          <GraduationCap className={cn('w-5 h-5', accountType === 'student' ? 'text-violet-400' : 'text-muted-foreground')} />
          <span className="text-xs font-medium">Student</span>
        </button>
        <button type="button" onClick={() => setAccountType('parent')}
          className={cn('flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all', accountType === 'parent' ? 'border-violet-500 bg-violet-500/10' : 'border-border hover:border-violet-500/30')}>
          <Users className={cn('w-5 h-5', accountType === 'parent' ? 'text-violet-400' : 'text-muted-foreground')} />
          <span className="text-xs font-medium">Parent</span>
        </button>
      </div>

      <OAuthButtons action="Register" />
      <div className="relative my-6"><div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div><div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Ya email se</span></div></div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input {...register('fullName')} placeholder="Full name" className="pl-10" error={errors.fullName?.message} />
        </div>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input {...register('email')} type="email" placeholder="Email address" className="pl-10" error={errors.email?.message} />
        </div>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input {...register('password')} type={showPass ? 'text' : 'password'} placeholder="Password (8+ chars)" className="pl-10 pr-10" error={errors.password?.message} />
          <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <Input {...register('confirmPassword')} type="password" placeholder="Confirm password" error={errors.confirmPassword?.message} />
        <Button type="submit" variant="gradient" className="w-full" size="lg" loading={isSubmitting}>
          <Zap className="w-4 h-4" /> {accountType === 'parent' ? 'Parent Account Banao' : 'Free Account Banao'}
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground mt-6">
        Pehle se account hai? <Link href="/login" className="text-primary font-medium hover:underline">Login karo</Link>
      </p>
    </div>
  );
}
