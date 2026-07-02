import { Metadata } from 'next';
import { createAdminClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
export const metadata: Metadata = { title: 'Admin - Users' };

export default async function AdminUsersPage() {
  const supabase = await createAdminClient();
  const { data: users } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(50);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Users</h1>
      <Card><CardContent className="p-0">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border text-left"><th className="p-4">Name</th><th className="p-4">Email</th><th className="p-4">Plan</th><th className="p-4">XP</th><th className="p-4">Joined</th></tr></thead>
          <tbody>
            {(users || []).map(u => (
              <tr key={u.id} className="border-b border-border/50">
                <td className="p-4">{u.full_name}</td>
                <td className="p-4 text-muted-foreground">{u.email}</td>
                <td className="p-4"><Badge variant={u.subscription_tier === 'FREE' ? 'outline' : 'success'}>{u.subscription_tier}</Badge></td>
                <td className="p-4">{u.xp}</td>
                <td className="p-4 text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent></Card>
    </div>
  );
}
