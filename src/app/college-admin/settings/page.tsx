import { createClient } from "@/lib/supabase/server";
import { getCollegeAdminContext } from "@/lib/college/access";
import { CollegeSettingsForm } from "@/components/college/settings/CollegeSettingsForm";

export const metadata = { title: "Settings | College Admin | ilm AI" };

export default async function CollegeAdminSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const context = await getCollegeAdminContext(supabase, user.id);
  if (!context) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Settings</h1>
      <CollegeSettingsForm college={context.college} />
    </div>
  );
}
