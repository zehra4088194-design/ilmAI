'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ACTIVE_SCHOOL_COOKIE, getSchoolContext } from './access';

export async function switchSchoolOrganization(formData: FormData) {
  const organizationId = String(formData.get('organization_id') || '');
  const returnTo = String(formData.get('return_to') || '/school-admin');
  const safeReturnTo =
    returnTo === '/school' || returnTo.startsWith('/school-admin') ? returnTo : '/school-admin';

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !organizationId) redirect('/login');

  const context = await getSchoolContext(supabase, user.id, organizationId);
  if (!context) redirect('/dashboard');

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_SCHOOL_COOKIE, organizationId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
  redirect(safeReturnTo);
}
