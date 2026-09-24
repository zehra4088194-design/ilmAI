import { createClient } from "@/lib/supabase/server";
import { getCollegeAdminContext } from "@/lib/college/access";
import { getApprovedStudents } from "@/lib/college/queries";
import { StudentRosterTable } from "@/components/college/students/StudentRosterTable";

export const metadata = { title: "Students | College Admin | ilm AI" };

export default async function CollegeAdminStudentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const context = await getCollegeAdminContext(supabase, user.id);
  if (!context) return null;

  const students = await getApprovedStudents(supabase, context.college.id);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Students</h1>
      <StudentRosterTable students={students} />
    </div>
  );
}
