'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isValidPhone, normalizePhone } from '@/lib/profile/phone';

function safeNext(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/dashboard';
  return value;
}

export async function saveRequiredPhone(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const phone = normalizePhone(String(formData.get('phone') || ''));
  const next = safeNext(String(formData.get('next') || ''));
  if (!isValidPhone(phone)) {
    redirect(`/onboarding/phone?error=invalid&next=${encodeURIComponent(next)}`);
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      phone,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (error) {
    console.error('[saveRequiredPhone] Failed to save phone:', error);
    redirect(`/onboarding/phone?error=save&next=${encodeURIComponent(next)}`);
  }

  redirect(next);
}
