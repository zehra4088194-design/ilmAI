'use server';

// Principal-to-principal cross-institution messaging (owner request). Deliberately its own small
// module rather than living inside school-erp/actions.ts or college-erp/actions.ts — this is the
// one piece of the school/college split that is genuinely shared plumbing (see the migration's
// header comment), so it gets a neutral home instead of picking one side arbitrarily.

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { checkDailyLimit } from '@/lib/rate-limit';
import { getSchoolContext } from '@/lib/school-erp/access';
import { getCollegeContext } from '@/lib/college-erp/access';
import type { SchoolActionState } from '@/lib/school-erp/types';

async function resolveCallerPrincipal() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const schoolContext = await getSchoolContext(supabase, user.id);
  if (schoolContext && ['owner', 'admin'].includes(schoolContext.membership.member_role)) {
    return {
      supabase,
      userId: user.id,
      institutionType: 'school' as const,
      organizationId: schoolContext.organization.id,
    };
  }
  const collegeContext = await getCollegeContext(supabase, user.id);
  if (collegeContext && ['owner', 'admin'].includes(collegeContext.membership.member_role)) {
    return {
      supabase,
      userId: user.id,
      institutionType: 'college' as const,
      organizationId: collegeContext.organization.id,
    };
  }
  return null;
}

export async function sendPrincipalMessage(
  _state: SchoolActionState,
  formData: FormData
): Promise<SchoolActionState> {
  try {
    const recipientInstitutionType = String(formData.get('recipient_institution_type') || '');
    const recipientOrganizationId = String(formData.get('recipient_organization_id') || '');
    const recipientCampusId = String(formData.get('recipient_campus_id') || '') || null;
    const subject = String(formData.get('subject') || '').trim();
    const body = String(formData.get('body') || '').trim();
    if (!['school', 'college'].includes(recipientInstitutionType) || !recipientOrganizationId) {
      throw new Error('Select an institution to message.');
    }
    if (!subject || subject.length > 200) throw new Error('Subject is required (max 200 characters).');
    if (!body || body.length > 4000) throw new Error('Message is required (max 4000 characters).');

    const caller = await resolveCallerPrincipal();
    if (!caller) throw new Error('Only a principal (owner/admin) can message another institution.');
    if (caller.institutionType === recipientInstitutionType && caller.organizationId === recipientOrganizationId) {
      throw new Error('You cannot message your own institution here.');
    }

    const limit = await checkDailyLimit(caller.userId, 'erp_mutation:institution-directory-message', 20);
    if (!limit.success) throw new Error('Too many directory messages today. Try again tomorrow.');

    const db = caller.supabase as any;
    const { error } = await db.from('institution_directory_messages').insert({
      sender_institution_type: caller.institutionType,
      sender_organization_id: caller.organizationId,
      sender_profile_id: caller.userId,
      recipient_institution_type: recipientInstitutionType,
      recipient_organization_id: recipientOrganizationId,
      recipient_campus_id: recipientCampusId,
      subject: subject.slice(0, 200),
      body: body.slice(0, 4000),
    });
    if (error) throw new Error(error.message);

    const returnPath = caller.institutionType === 'school' ? '/school-admin/communication' : '/college-admin/communication';
    revalidatePath(returnPath);
    return { success: true, message: 'Message sent.' };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'The message could not be sent.' };
  }
}
