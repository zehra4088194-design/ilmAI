'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminUser } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/server';

export async function unblockStudentChat(formData: FormData) {
  const adminUser = await requireAdminUser();
  if (!adminUser) throw new Error('Forbidden');

  const requestId = String(formData.get('request_id') || '');
  if (!requestId) throw new Error('request_id required');

  const admin = await createAdminClient();
  const { error } = await admin
    .from('student_chat_requests')
    .update({
      moderation_blocked_until: null,
      moderation_warning_count: 0,
      moderation_last_reason: 'Admin manually unblocked this conversation.',
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId);

  if (error) throw new Error(error.message);
  revalidatePath('/admin/chat-moderation');
}
