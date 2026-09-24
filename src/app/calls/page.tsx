import { redirect } from 'next/navigation';
import { PhoneCall } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { requireSchoolContext } from '@/lib/school-erp/access';
import { requireCollegeContext } from '@/lib/college-erp/access';
import { getCallDirectory } from '@/lib/calling/queries';
import { CallDirectoryList } from '@/components/features/calling/CallDirectoryList';
import { CallButton } from '@/components/features/calling/CallButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createAdminClient } from '@/lib/supabase/server';

export default async function CallsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=%2Fcalls');

  const school = await requireSchoolContext('dashboard.read');
  const schoolContext = school.context;
  const collegeContext = schoolContext
    ? null
    : (await requireCollegeContext('dashboard.read')).context;

  const institutionType = schoolContext
    ? ('school' as const)
    : collegeContext
      ? ('college' as const)
      : ('consumer' as const);

  const organizationId =
    schoolContext?.organization.id || collegeContext?.organization.id || 'consumer';
  const currentRole =
    schoolContext?.membership.member_role || collegeContext?.membership.member_role || 'student';

  let directory = await getCallDirectory(
    supabase,
    institutionType,
    organizationId,
    user.id
  );

  // A plain consumer parent should only see their explicitly linked children here.
  if (institutionType === 'consumer' && currentRole === 'parent') {
    const db = createAdminClient() as any;
    const { data: links } = await db
      .from('parent_student_links')
      .select('student_id')
      .eq('parent_id', user.id)
      .eq('status', 'approved');

    const studentIds = new Set(
      (links || []).map((row: any) => row.student_id).filter(Boolean)
    );
    directory = directory.filter((entry) => studentIds.has(entry.profile_id));
  }

  return (
    <main className="mx-auto w-full max-w-6xl space-y-5 py-3">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Contact Directory</h1>
        <p className="text-muted-foreground text-sm">
          In-app person-to-person calling is disabled. Use the saved phone number to call through
          your device's normal dialer.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <PhoneCall className="h-4 w-4" /> People
          </CardTitle>
        </CardHeader>
        <CardContent>
          {institutionType === 'consumer' ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {directory.length ? (
                directory.map((person) => (
                  <div key={person.profile_id} className="flex items-center gap-3 rounded-xl border p-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
                      {person.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={person.avatar_url}
                          alt={person.full_name || 'User'}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-sm font-semibold">
                          {(person.full_name || 'U').slice(0, 1).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {person.full_name || 'ilm AI user'}
                      </p>
                      <p className="text-muted-foreground text-xs capitalize">
                        {person.member_role}
                      </p>
                      <p className="text-muted-foreground mt-0.5 truncate text-xs">
                        {person.phone || 'No phone number'}
                      </p>
                    </div>
                    <CallButton
                      institutionType="consumer"
                      organizationId="consumer"
                      target={{
                        userId: person.profile_id,
                        name: person.full_name || 'ilm AI user',
                        avatarUrl: person.avatar_url,
                        phone: person.phone,
                      }}
                    />
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground py-6 text-center text-sm">
                  No contacts are available.
                </p>
              )}
            </div>
          ) : (
            <CallDirectoryList
              institutionType={institutionType}
              organizationId={organizationId}
              entries={directory}
            />
          )}
        </CardContent>
      </Card>
    </main>
  );
}
