'use server';

// Platform-admin-only management for the Quran Class module: add teachers by
// email (invite-before-signup, same as the school/college owner flow), create
// groups with a schedule, and assign/remove students. Deliberately NOT under
// school-erp/college-erp — per the owner's explicit instruction, teachers here
// are added directly by the platform admin, not a school principal.
import { revalidatePath } from 'next/cache';
import { nanoid } from 'nanoid';
import slugify from 'slugify';
import { requireAdminUser } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { inviteOrFindProfileId } from '@/lib/auth/inviteOrFindProfile';
import type { QuranActionState } from './action-state';

export type { QuranActionState } from './action-state';

export async function addQuranTeacher(_state: QuranActionState, formData: FormData): Promise<QuranActionState> {
  const admin = await requireAdminUser();
  if (!admin) return { success: false, message: 'Admin access required.' };
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const bio = String(formData.get('bio') || '').trim() || null;
  if (!email.includes('@')) return { success: false, message: 'A valid email is required.' };

  let profile: { id: string; invited: boolean };
  try {
    profile = await inviteOrFindProfileId(email, { profileRole: 'teacher' });
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Could not invite this email.' };
  }

  const db = (await createAdminClient()) as any;
  const { error } = await db
    .from('quran_teachers')
    .upsert(
      { profile_id: profile.id, bio, status: 'active', created_by: admin.id },
      { onConflict: 'profile_id' }
    );
  if (error) return { success: false, message: error.message };

  revalidatePath('/admin/quran');
  return {
    success: true,
    message: profile.invited
      ? `Teacher invited — an email was sent to ${email} to set a password.`
      : `${email} is now a Quran teacher.`,
  };
}

export async function setQuranTeacherStatus(_state: QuranActionState, formData: FormData): Promise<QuranActionState> {
  const admin = await requireAdminUser();
  if (!admin) return { success: false, message: 'Admin access required.' };
  const teacherId = String(formData.get('teacher_id') || '').trim();
  const status = String(formData.get('status') || 'active');
  if (!teacherId) return { success: false, message: 'Teacher is required.' };

  const db = (await createAdminClient()) as any;
  const { error } = await db.from('quran_teachers').update({ status }).eq('id', teacherId);
  if (error) return { success: false, message: error.message };
  revalidatePath('/admin/quran');
  return { success: true, message: 'Teacher status updated.' };
}

export async function createQuranGroup(_state: QuranActionState, formData: FormData): Promise<QuranActionState> {
  const admin = await requireAdminUser();
  if (!admin) return { success: false, message: 'Admin access required.' };
  const name = String(formData.get('name') || '').trim();
  const teacherId = String(formData.get('teacher_id') || '').trim();
  const sessionTime = String(formData.get('session_time') || '').trim();
  const maxStudents = Number(formData.get('max_students')) || 15;
  const daysOfWeek = formData
    .getAll('days_of_week')
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value >= 1 && value <= 7);
  if (name.length < 2 || !teacherId || !/^\d{2}:\d{2}$/.test(sessionTime)) {
    return { success: false, message: 'Group name, teacher, and a session time (HH:MM) are required.' };
  }

  const db = (await createAdminClient()) as any;
  const roomName = `quran-${slugify(name, { lower: true, strict: true }).slice(0, 40)}-${nanoid(6)}`;
  const { error } = await db.from('quran_groups').insert({
    name,
    teacher_id: teacherId,
    session_time: sessionTime,
    days_of_week: daysOfWeek.length ? daysOfWeek : [1, 2, 3, 4, 5, 6, 7],
    max_students: maxStudents,
    livekit_room_name: roomName,
    created_by: admin.id,
  });
  if (error) return { success: false, message: error.message };

  revalidatePath('/admin/quran');
  return { success: true, message: `${name} group created.` };
}

export async function setQuranGroupStatus(_state: QuranActionState, formData: FormData): Promise<QuranActionState> {
  const admin = await requireAdminUser();
  if (!admin) return { success: false, message: 'Admin access required.' };
  const groupId = String(formData.get('group_id') || '').trim();
  const status = String(formData.get('status') || 'active');
  if (!groupId) return { success: false, message: 'Group is required.' };

  const db = (await createAdminClient()) as any;
  const { error } = await db.from('quran_groups').update({ status, updated_at: new Date().toISOString() }).eq('id', groupId);
  if (error) return { success: false, message: error.message };
  revalidatePath('/admin/quran');
  return { success: true, message: 'Group status updated.' };
}

export async function addStudentToQuranGroup(_state: QuranActionState, formData: FormData): Promise<QuranActionState> {
  const admin = await requireAdminUser();
  if (!admin) return { success: false, message: 'Admin access required.' };
  const groupId = String(formData.get('group_id') || '').trim();
  const email = String(formData.get('email') || '').trim().toLowerCase();
  if (!groupId || !email.includes('@')) return { success: false, message: 'Group and a valid student email are required.' };

  const db = (await createAdminClient()) as any;
  const { count } = await db
    .from('quran_group_members')
    .select('id', { count: 'exact', head: true })
    .eq('group_id', groupId)
    .eq('status', 'active');
  const { data: group } = await db.from('quran_groups').select('max_students').eq('id', groupId).maybeSingle();
  if (group && (count || 0) >= group.max_students) {
    return { success: false, message: `This group is full (max ${group.max_students} students).` };
  }

  let profile: { id: string; invited: boolean };
  try {
    profile = await inviteOrFindProfileId(email, { profileRole: 'student' });
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Could not invite this email.' };
  }

  const { error } = await db
    .from('quran_group_members')
    .upsert(
      { group_id: groupId, student_id: profile.id, status: 'active', added_by: admin.id },
      { onConflict: 'group_id,student_id' }
    );
  if (error) return { success: false, message: error.message };

  revalidatePath('/admin/quran');
  return {
    success: true,
    message: profile.invited ? `Student invited — an email was sent to ${email}.` : `${email} added to the group.`,
  };
}

export async function removeStudentFromQuranGroup(_state: QuranActionState, formData: FormData): Promise<QuranActionState> {
  const admin = await requireAdminUser();
  if (!admin) return { success: false, message: 'Admin access required.' };
  const memberId = String(formData.get('member_id') || '').trim();
  if (!memberId) return { success: false, message: 'Member is required.' };

  const db = (await createAdminClient()) as any;
  const { error } = await db.from('quran_group_members').update({ status: 'removed' }).eq('id', memberId);
  if (error) return { success: false, message: error.message };
  revalidatePath('/admin/quran');
  return { success: true, message: 'Student removed from group.' };
}
