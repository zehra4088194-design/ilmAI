'use client';
import { Navbar } from '@/components/features/landing/Navbar';
import { LandingFooter } from '@/components/features/landing/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, MessageSquare } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export default function ContactPage() {
  const [loading, setLoading] = useState(false);
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    setTimeout(() => { toast.success('Message sent. We will reply soon.'); setLoading(false); }, 1000);
  };
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-32 pb-20 container mx-auto px-4 max-w-xl">
        <div className="text-center mb-10">
          <MessageSquare className="w-10 h-10 text-violet-400 mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-2">Contact us</h1>
          <p className="text-muted-foreground">Have a question? We are here to help.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 glass rounded-2xl p-6 border border-border/50">
          <Input placeholder="Your name" required />
          <Input type="email" placeholder="Email address" required />
          <textarea placeholder="Write your message..." rows={5} required className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          <Button type="submit" variant="gradient" className="w-full" loading={loading}><Mail className="w-4 h-4" />Send message</Button>
        </form>
      </main>
      <LandingFooter />
    </div>
  );
}
