'use client';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { getBrowserSiteUrl } from '@/lib/utils/siteUrl';
import { toast } from 'sonner';

export function OAuthButtons({ action = 'Login', role }: { action?: string; role?: 'student' | 'parent' }) {
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'facebook' | null>(null);
  const searchParams = useSearchParams();
  const supabase = createClient();
  const signInWithProvider = async (provider: 'google' | 'facebook') => {
    setLoadingProvider(provider);
    const callbackUrl = new URL('/api/auth/callback', getBrowserSiteUrl());
    const redirect = searchParams.get('redirect');
    if (redirect) callbackUrl.searchParams.set('redirect', redirect);
    if (role) callbackUrl.searchParams.set('role', role);
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: callbackUrl.toString() } });
    if (error) { toast.error(error.message); setLoadingProvider(null); }
  };
  return (
    <div className="space-y-2.5">
      <Button variant="outline" className="w-full" size="lg" onClick={() => signInWithProvider('google')} loading={loadingProvider === 'google'} disabled={loadingProvider === 'facebook'}>
        <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
        {action} with Google
      </Button>
      <Button variant="outline" className="w-full" size="lg" onClick={() => signInWithProvider('facebook')} loading={loadingProvider === 'facebook'} disabled={loadingProvider === 'google'}>
        <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.95.93-1.95 1.89v2.25h3.32l-.53 3.49h-2.79V24C19.61 23.1 24 18.1 24 12.07z" fill="#1877F2"/></svg>
        {action} with Facebook
      </Button>
    </div>
  );
}
