'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function bookmarkOpportunity(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const opportunityId = String(formData.get('opportunity_id'));
  const reminderDate = String(formData.get('reminder_date') || '') || null;
  await supabase.from('opportunity_bookmarks' as any).upsert({
    student_id: user.id,
    opportunity_id: opportunityId,
    reminder_date: reminderDate,
  }, { onConflict: 'student_id,opportunity_id' });
  revalidatePath('/opportunities');
  revalidatePath('/opportunities/saved');
}

export async function removeOpportunityBookmark(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('opportunity_bookmarks' as any).delete().eq('student_id', user.id).eq('opportunity_id', String(formData.get('opportunity_id')));
  revalidatePath('/opportunities');
  revalidatePath('/opportunities/saved');
}
