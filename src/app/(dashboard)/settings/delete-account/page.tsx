import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { DeleteAccountFlow } from '@/components/features/settings/DeleteAccountFlow';

export const metadata: Metadata = {
  title: 'Delete Account',
};

export default async function DeleteAccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Delete Account</h1>
          <p className="text-muted-foreground">Please log in to access this page.</p>
        </div>
      </div>
    );
  }

  const { data: profile } = await supabase.from('profiles').select('full_name, email').eq('id', user.id).single();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Delete Account</h1>
        <p className="text-muted-foreground">Permanently delete your ilm AI account and all associated data.</p>
      </div>

      <DeleteAccountFlow userEmail={user.email || ''} fullName={profile?.full_name || 'User'} />
    </div>
  );
}
