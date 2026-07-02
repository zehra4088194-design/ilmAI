'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const supabase = createClient();
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    if (error) { toast.error(error.message); }
    else { setSent(true); toast.success('Reset link bheja gaya!'); }
    setLoading(false);
  };
  if (sent) return (
    <div className="text-center">
      <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4"><Mail className="w-8 h-8 text-green-500" /></div>
      <h2 className="text-xl font-bold mb-2">Email Bhej Diya!</h2>
      <p className="text-muted-foreground mb-6">{email} par password reset link bheja gaya hai.</p>
      <Button asChild variant="outline" className="w-full"><Link href="/login"><ArrowLeft className="w-4 h-4" />Login Par Wapis Jao</Link></Button>
    </div>
  );
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Password Bhool Gaye? 🔑</h1>
      <p className="text-muted-foreground mb-8">Email daalo, reset link bhej dete hain.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} required className="pl-10" />
        </div>
        <Button type="submit" variant="gradient" className="w-full" size="lg" loading={loading}>Reset Link Bhejo</Button>
      </form>
      <div className="mt-6 text-center">
        <Link href="/login" className="text-sm text-primary hover:underline flex items-center justify-center gap-1"><ArrowLeft className="w-3 h-3" />Login par wapis jao</Link>
      </div>
    </div>
  );
}
