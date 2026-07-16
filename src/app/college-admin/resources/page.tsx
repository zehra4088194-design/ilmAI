import { createAdminClient, createClient } from '@/lib/supabase/server';
import { getCollegeAdminContext } from '@/lib/college/access';
import { getCollegeResources } from '@/lib/college/queries';
import { ResourceList } from '@/components/college/resources/ResourceList';

export const metadata = { title: 'Resources | College Admin | ilm AI' };

export default async function CollegeAdminResourcesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const context = await getCollegeAdminContext(supabase, user.id);
  if (!context) return null;

  const admin = await createAdminClient();
  const resources = await getCollegeResources(admin, context.college.id);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Resources</h1>
      <ResourceList collegeId={context.college.id} initialResources={resources} />
    </div>
  );
}
