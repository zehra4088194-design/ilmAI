import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { PersonalizationModal } from '@/components/features/onboarding/PersonalizationModal';
import { PublicResourceShell } from '@/components/layout/PublicResourceShell';
import { resolveInstitutionBranding } from '@/lib/branding/resolveInstitutionBranding';
import { resolveMembershipRedirect } from '@/lib/auth/resolveMembershipRedirect';
import { headers } from 'next/headers';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const pathname = (await headers()).get('x-invoke-path') || '';
  if (!user) {
    if (pathname.startsWith('/library') || pathname.startsWith('/past-papers')) {
      return <PublicResourceShell>{children}</PublicResourceShell>;
    }
    redirect('/login');
  }

  // A school/college member (owner, admin, teacher, staff) landing on a generic consumer
  // route — a direct URL, an old bookmark, the browser back button — used to see the
  // "Teacher Portal" trim built for an individual consumer-app teacher, a confusing mismatch
  // for their real institution role. /school-admin and /college-admin live in their own route
  // groups outside (dashboard), so this never fires for the portal itself — only for exactly
  // the stray-URL case it's meant to catch. Same shared resolver the login/callback flows use
  // (§1's fix), so "which portal wins" logic lives in exactly one place.
  const membershipRedirect = await resolveMembershipRedirect(supabase, user.id, pathname);
  if (membershipRedirect.institutionType) {
    redirect(membershipRedirect.destination);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, board, grade_level, is_profile_complete, ai_onboarding_complete, science_group, optional_subject_ids')
    .eq('id', user.id)
    .single();

  let personalizationSubjects: { id: string; name: string; isOptional: boolean }[] = [];
  const shouldShowPersonalization =
    profile?.role === 'student' &&
    profile.ai_onboarding_complete === false &&
    profile.is_profile_complete === true &&
    profile.board !== null &&
    profile.grade_level !== null;
  const personalizationGradeLevel = shouldShowPersonalization ? profile.grade_level : null;

  if (shouldShowPersonalization) {
    const { data } = await supabase
      .from('subjects')
      .select('id, name, slug, stream, is_optional')
      .eq('is_active', true)
      .contains('boards', [profile.board])
      .contains('grade_levels', [profile.grade_level])
      .order('name');

    personalizationSubjects = (data ?? [])
      .filter((subject) => {
        if (!subject.is_optional || !profile.science_group) return true;
        if ((profile.optional_subject_ids || []).includes(subject.id)) return true;
        const identity = `${subject.name} ${subject.slug} ${subject.stream || ''}`.toLowerCase();
        return profile.science_group === 'biology'
          ? identity.includes('biology') || identity.includes('pre-medical')
          : identity.includes('computer');
      })
      .map((subject) => ({
        id: subject.id,
        name: subject.name,
        isOptional: profile.science_group ? false : subject.is_optional,
      }));
  }

  const branding = await resolveInstitutionBranding(supabase, user.id);

  return (
    <>
      <DashboardShell branding={branding}>{children}</DashboardShell>
      {shouldShowPersonalization && personalizationGradeLevel && (
        <PersonalizationModal
          gradeLevel={personalizationGradeLevel}
          subjects={personalizationSubjects}
        />
      )}
    </>
  );
}
