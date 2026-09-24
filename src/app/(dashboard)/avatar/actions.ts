'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { awardCoins } from '@/lib/gamification/coins';

export async function purchaseAvatarItem(itemId: string) {
  const supabase = await createClient();
  const db = supabase as any;
  const service = createServiceClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: 'error', error: 'Login required' };

  const { data: item } = await db.from('avatar_items').select('id, coin_price').eq('id', itemId).single();
  const { data: profile } = await supabase.from('profiles').select('coins').eq('id', user.id).single();
  if (!item) return { status: 'error', error: 'Item not found' };
  if ((profile?.coins || 0) < item.coin_price) return { status: 'error', error: 'Not enough coins' };

  if (item.coin_price > 0) await awardCoins(user.id, -item.coin_price, 'avatar_purchase', itemId);
  await service.from('student_avatar_inventory').upsert({ student_id: user.id, item_id: itemId }, { onConflict: 'student_id,item_id' });
  revalidatePath('/avatar');
  return { status: 'success' };
}

export async function equipAvatarItem(itemId: string) {
  const supabase = await createClient();
  const db = supabase as any;
  const service = createServiceClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: 'error', error: 'Login required' };

  const { data: item } = await db.from('avatar_items').select('id, slot, is_default').eq('id', itemId).single();
  if (!item) return { status: 'error', error: 'Item not found' };

  const { data: owned } = await db
    .from('student_avatar_inventory')
    .select('id')
    .eq('student_id', user.id)
    .eq('item_id', itemId)
    .maybeSingle();
  if (!owned && !item.is_default) return { status: 'error', error: 'Purchase first' };
  if (!owned && item.is_default) {
    await service.from('student_avatar_inventory').upsert({ student_id: user.id, item_id: itemId }, { onConflict: 'student_id,item_id' });
  }

  const { data: sameSlotItems } = await db.from('avatar_items').select('id').eq('slot', item.slot);
  const ids = (sameSlotItems || []).map((row: any) => row.id);
  if (ids.length) {
    await service.from('student_avatar_inventory').update({ equipped: false }).eq('student_id', user.id).in('item_id', ids);
  }
  await service.from('student_avatar_inventory').upsert({ student_id: user.id, item_id: itemId, equipped: true }, { onConflict: 'student_id,item_id' });
  revalidatePath('/avatar');
  return { status: 'success' };
}
