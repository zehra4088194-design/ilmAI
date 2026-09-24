'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { notifyOrgAdminsOfNewRequest } from './join-request-notify';
import type { ActionResult, SchoolJoinRole } from './types';

/**
 * Mirrors src/lib/college/actions/join-requests.ts, adapted to the School
 * ERP's organization_id / school_has_role() model. On approval, a database
 * trigger (handle_school_join_request_approval, see
 * supabase/migrations/20260811090000_school_join_requests.sql) creates the
 * school_memberships row — this file only ever touches school_join_requests.
 *
 * This action is for a signed-in user requesting to join from within the
 * app. Institutional signup instead goes through
 * src/lib/school-erp/join-request-signup.ts, called from the auth routes
 * once the profile row exists.
 */

export async function requestToJoinSchool(organizationId: string, roleRequested: SchoolJoinRole): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'You need to sign in first.' };
  const db = supabase as any;

  const { error } = await db.from('school_join_requests').insert({
    requester_id: user.id,
    organization_id: organizationId,
    role_requested: roleRequested,
  });

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'You already have an active request with an institution.' };
    }
    return { success: false, error: 'Could not send the request. Please try again.' };
  }

  const { data: profile } = await db.from('profiles').select('full_name, email').eq('id', user.id).maybeSingle();
  await notifyOrgAdminsOfNewRequest(organizationId, profile?.full_name || profile?.email || 'A new user', roleRequested);

  revalidatePath('/school-admin/requests');
  revalidatePath('/school');
  return { success: true };
}

export async function cancelJoinRequest(requestId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'You need to sign in first.' };
  const db = supabase as any;

  const { error } = await db
    .from('school_join_requests')
    .delete()
    .eq('id', requestId)
    .eq('requester_id', user.id)
    .eq('status', 'pending');

  if (error) return { success: false, error: 'Could not cancel the request. Please try again.' };

  revalidatePath('/school');
  return { success: true };
}

export async function approveJoinRequest(requestId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'You need to sign in first.' };
  const db = supabase as any;

  // RLS ("Org admins can resolve join requests") is the real enforcement
  // here — this update only succeeds if `user` is an owner/admin of this
  // request's organization.
  const { error } = await db
    .from('school_join_requests')
    .update({ status: 'approved', resolved_at: new Date().toISOString(), resolved_by: user.id })
    .eq('id', requestId)
    .eq('status', 'pending');

  if (error) return { success: false, error: 'Could not approve this request. Please try again.' };

  revalidatePath('/school-admin/requests');
  revalidatePath('/school-admin/people');
  revalidatePath('/school-admin');
  return { success: true };
}

export async function declineJoinRequest(requestId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'You need to sign in first.' };
  const db = supabase as any;

  const { error } = await db
    .from('school_join_requests')
    .update({ status: 'declined', resolved_at: new Date().toISOString(), resolved_by: user.id })
    .eq('id', requestId)
    .eq('status', 'pending');

  if (error) return { success: false, error: 'Could not decline this request. Please try again.' };

  revalidatePath('/school-admin/requests');
  revalidatePath('/school-admin');
  return { success: true };
}
