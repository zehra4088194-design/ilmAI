import { Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveColleges, getStudentCollegeState } from "@/lib/college/queries";
import { CollegeCard } from "@/components/college/CollegeCard";
import { CollegeSearchBar } from "@/components/college/CollegeSearchBar";
import { EmptyState } from "@/components/ui/EmptyState";
import type { StudentCollegeState } from "@/lib/college/types";

export const metadata = { title: "Colleges | ilm AI" };

export default async function CollegesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [colleges, studentStatus] = await Promise.all([
    getActiveColleges(supabase, q),
    user ? getStudentCollegeState(supabase, user.id) : Promise.resolve<StudentCollegeState>({ state: "none" }),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-bold">Colleges</h1>
        <p className="mt-1 text-muted-foreground">
          Browse colleges on ilm AI and request to join yours for lectures and resources.
        </p>
      </div>

      <div className="max-w-sm">
        <CollegeSearchBar initialValue={q ?? ""} />
      </div>

      {colleges.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No colleges yet"
          description={q ? "No colleges match your search." : "Colleges will show up here once they're added."}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {colleges.map((college) => (
            <CollegeCard key={college.id} college={college} studentStatus={studentStatus} userId={user?.id ?? null} />
          ))}
        </div>
      )}
    </div>
  );
}
