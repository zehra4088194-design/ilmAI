'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { toast.error(error.message); }
    else { toast.success('Password updated!'); router.push('/login'); }
    setLoading(false);
  };
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Reset Password</h1>
      <p className="text-muted-foreground mb-8">Enter your new password below.</p>
      <form onSubmit={handleReset} className="space-y-4">
        <Input type="password" placeholder="New password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
        <Button type="submit" variant="gradient" className="w-full" loading={loading}>Update Password</Button>
      </form>
    </div>
  );
}
