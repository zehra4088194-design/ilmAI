import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { AvatarCustomizer } from '@/components/gamification/AvatarCustomizer';

export const metadata: Metadata = { title: 'Avatar' };

export default async function AvatarPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: profile }, { data: items }, { data: inventory }] = await Promise.all([
    supabase.from('profiles').select('coins').eq('id', user!.id).single(),
    supabase.from('avatar_items' as any).select('*').order('slot'),
    supabase.from('student_avatar_inventory' as any).select('item_id, equipped').eq('student_id', user!.id),
  ]);
  const inventoryMap = new Map((inventory || []).map((row: any) => [row.item_id, row]));
  const merged = (items || []).map((item: any) => ({
    ...item,
    owned: Boolean(inventoryMap.get(item.id)) || item.is_default,
    equipped: Boolean(inventoryMap.get(item.id)?.equipped),
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="text-sm font-semibold text-violet-400">Gamification</p>
        <h1 className="mt-1 text-2xl font-bold md:text-3xl">Avatar Customizer</h1>
      </div>
      <AvatarCustomizer items={merged} coins={profile?.coins || 0} />
    </div>
  );
}
