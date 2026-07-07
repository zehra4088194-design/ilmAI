import { Metadata } from 'next';
import Link from 'next/link';
import { MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
export const metadata: Metadata = { title: 'Verify Email - ilm AI' };
export default function VerifyEmailPage() {
  return (
    <div className="text-center">
      <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
        <MailCheck className="w-10 h-10 text-green-500" />
      </div>
      <h1 className="text-2xl font-bold mb-2">Check Your Email!</h1>
      <p className="text-muted-foreground mb-8">Tumhare email par ek verification link bheja gaya hai. Link click karo aur account activate karo.</p>
      <Button asChild variant="gradient" className="w-full"><Link href="/login">Login Page Par Jao</Link></Button>
    </div>
  );
}
