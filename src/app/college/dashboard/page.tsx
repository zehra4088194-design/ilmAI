import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getApprovedCollegeId } from "@/lib/college/access";
import { getCollegeById, getCollegeLectures, getCollegeResources } from "@/lib/college/queries";
import { CollegeDashboardTabs } from "@/components/college/dashboard/CollegeDashboardTabs";

export const metadata = { title: "My College | ilm AI" };

export default async function CollegeDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const collegeId = await getApprovedCollegeId(supabase, user.id);
  if (!collegeId) redirect("/colleges");

  const [college, lectures, resources] = await Promise.all([
    getCollegeById(supabase, collegeId),
    getCollegeLectures(supabase, collegeId),
    getCollegeResources(supabase, collegeId),
  ]);

  if (!college) redirect("/colleges");

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-8">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted">
          {college.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={college.logo_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-lg font-semibold text-muted-foreground">{college.name.charAt(0)}</span>
          )}
        </div>
        <div>
          <h1 className="text-xl font-bold">{college.name}</h1>
          <p className="text-sm text-muted-foreground">{college.city}</p>
        </div>
      </div>

      <CollegeDashboardTabs lectures={lectures} resources={resources} />
    </div>
  );
}
