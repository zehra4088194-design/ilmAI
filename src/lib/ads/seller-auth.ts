import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

/**
 * A seller is any logged-in user whose email is in ad_seller_emails (added by an admin from
 * /admin/house-ads). Mirrors requireAdminUser()'s shape — deliberately its own, separate
 * allowlist rather than a new `profiles.role` value, so granting seller access can never touch
 * the role-based redirects/authorization the rest of the app already builds on profiles.role.
 */
export async function requireSellerUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) return null;

  const service = createServiceClient();
  const { data } = await service
    .from('ad_seller_emails')
    .select('email')
    .eq('email', user.email.toLowerCase())
    .maybeSingle();

  return data ? user : null;
}
