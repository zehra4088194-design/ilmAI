import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getApprovedCollegeId } from '@/lib/college/access';
import { getCollegeById, getCollegeLectures, getCollegeResourceMetadata } from '@/lib/college/queries';
import { CollegeDashboardTabs } from '@/components/college/dashboard/CollegeDashboardTabs';

export const metadata = { title: 'My College | ilm AI' };

export default async function CollegeDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const collegeId = await getApprovedCollegeId(supabase, user.id);
  if (!collegeId) redirect('/colleges');

  const [college, lectures, resources] = await Promise.all([
    getCollegeById(supabase, collegeId),
    getCollegeLectures(supabase, collegeId),
    getCollegeResourceMetadata(supabase, collegeId),
  ]);
  const { data: profile } = await supabase
    .from('profiles')
    .select('university_stream, university_degree, university_semester')
    .eq('id', user.id)
    .maybeSingle();

  if (!college) redirect('/colleges');

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-8">
      <div className="flex items-center gap-3">
        <div className="bg-muted flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl">
          {college.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={college.logo_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-muted-foreground text-lg font-semibold">{college.name.charAt(0)}</span>
          )}
        </div>
        <div>
          <h1 className="text-xl font-bold">{college.name}</h1>
          <p className="text-muted-foreground text-sm">{college.city}</p>
        </div>
      </div>

      <CollegeDashboardTabs lectures={lectures} resources={resources} profile={profile} />
    </div>
  );
}
