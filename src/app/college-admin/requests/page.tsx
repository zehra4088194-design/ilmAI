import { createClient } from "@/lib/supabase/server";
import { getCollegeAdminContext } from "@/lib/college/access";
import { getPendingJoinRequests } from "@/lib/college/queries";
import { JoinRequestList } from "@/components/college/requests/JoinRequestList";

export const metadata = { title: "Join Requests | College Admin | ilm AI" };

export default async function CollegeAdminRequestsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const context = await getCollegeAdminContext(supabase, user.id);
  if (!context) return null;

  const requests = await getPendingJoinRequests(supabase, context.college.id);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Join requests</h1>
      <JoinRequestList initialRequests={requests} />
    </div>
  );
}
