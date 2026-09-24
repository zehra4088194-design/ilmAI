import { notFound } from "next/navigation";
import { MapPin, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCollegeWithCounts, getStudentCollegeState } from "@/lib/college/queries";
import { CollegeRequestButton } from "@/components/college/CollegeRequestButton";
import type { StudentCollegeState } from "@/lib/college/types";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return { title: `${slug} | Colleges | ilm AI` };
}

export default async function CollegeProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const college = await getCollegeWithCounts(supabase, slug);
  if (!college) notFound();

  const studentStatus: StudentCollegeState = user
    ? await getStudentCollegeState(supabase, user.id)
    : { state: "none" };

  const isMyCollege = studentStatus.state === "approved" && studentStatus.collegeId === college.id;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-8">
      <div className="glass overflow-hidden rounded-2xl border border-border/60 bg-card/60 backdrop-blur-xl">
        {college.cover_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={college.cover_url} alt="" className="h-40 w-full object-cover" />
        )}
        <div className="flex items-start gap-4 p-6">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-muted">
            {college.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={college.logo_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-2xl font-semibold text-muted-foreground">{college.name.charAt(0)}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold">{college.name}</h1>
            {college.city && (
              <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0" />
                {college.city}
              </p>
            )}
          </div>
        </div>
      </div>

      {college.description && <p className="text-muted-foreground">{college.description}</p>}

      {!isMyCollege && (
        <div className="glass flex items-center justify-between gap-4 rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur-xl">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="h-4 w-4 shrink-0" />
            <span>
              {college.lecture_count} lectures, {college.resource_count} resources — join to unlock
            </span>
          </div>
        </div>
      )}

      <CollegeRequestButton
        collegeId={college.id}
        collegeSlug={college.slug}
        studentStatus={studentStatus}
        userId={user?.id ?? null}
      />
    </div>
  );
}
