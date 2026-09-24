import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAllCollegesForSuperAdmin, getCollegeById } from "@/lib/college/queries";
import { EditCollegeForm } from "@/components/college/super-admin/EditCollegeForm";
import { AssignCollegeAdminForm } from "@/components/college/super-admin/AssignCollegeAdminForm";

export async function generateMetadata() {
  return { title: "Edit College | Admin | ilm AI" };
}

export default async function EditCollegePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const college = await getCollegeById(supabase, id);
  if (!college) notFound();

  // Reuses the super-admin list query (which already joins college_admins)
  // rather than a separate lookup, to stay consistent with one FK-embed
  // pattern for this relationship (see queries.ts for why the embed needs
  // the explicit constraint name).
  const all = await getAllCollegesForSuperAdmin(supabase);
  const currentAdmin = all.find((c) => c.id === id)?.admin ?? null;

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <h1 className="text-xl font-bold">{college.name}</h1>
        <p className="text-sm text-muted-foreground">/colleges/{college.slug}</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">College details</h2>
        <EditCollegeForm college={college} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">College admin</h2>
        <AssignCollegeAdminForm collegeId={college.id} currentAdmin={currentAdmin} />
      </section>
    </div>
  );
}
