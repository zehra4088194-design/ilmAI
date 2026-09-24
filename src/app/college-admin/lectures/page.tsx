import { createClient } from "@/lib/supabase/server";
import { getCollegeAdminContext } from "@/lib/college/access";
import { getCollegeLectures } from "@/lib/college/queries";
import { LectureList } from "@/components/college/lectures/LectureList";

export const metadata = { title: "Lectures | College Admin | ilm AI" };

export default async function CollegeAdminLecturesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const context = await getCollegeAdminContext(supabase, user.id);
  if (!context) return null;

  const lectures = await getCollegeLectures(supabase, context.college.id);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Lectures</h1>
      <LectureList collegeId={context.college.id} initialLectures={lectures} />
    </div>
  );
}
