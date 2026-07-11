"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { StudentCollegeState } from "@/lib/college/types";

/**
 * Tracks the current student's College Portal state (none / pending /
 * approved) on the client, with a Supabase Realtime subscription so an
 * approval made by a college admin in a different session shows up here
 * without a manual refresh (per spec: "student should see this reflected
 * without manual refresh").
 *
 * Pass `initialState` from a Server Component fetch
 * (queries.getStudentCollegeState) to avoid a loading flash on first paint —
 * e.g. in DashboardSidebar, which already knows `user.id` from useAuth().
 */
export function useCollegeStatus(userId: string | null | undefined, initialState?: StudentCollegeState) {
  const [status, setStatus] = useState<StudentCollegeState>(initialState ?? { state: "none" });
  const [loading, setLoading] = useState(!initialState);

  const refresh = useCallback(async () => {
    if (!userId) {
      setStatus({ state: "none" });
      setLoading(false);
      return;
    }
    const supabase = createClient();
    const db = supabase as any;

    const { data: profile } = await db
      .from("profiles")
      .select("college_id")
      .eq("id", userId)
      .maybeSingle();

    if (profile?.college_id) {
      const { data: college } = await db
        .from("colleges")
        .select("id, name, slug")
        .eq("id", profile.college_id)
        .maybeSingle();
      if (college) {
        setStatus({ state: "approved", collegeId: college.id, collegeName: college.name, collegeSlug: college.slug });
        setLoading(false);
        return;
      }
    }

    const { data: pending } = await db
      .from("college_join_requests")
      .select("id, college_id, colleges ( name )")
      .eq("student_id", userId)
      .eq("status", "pending")
      .maybeSingle();

    if (pending) {
      const collegeRel = pending.colleges as unknown as { name: string } | { name: string }[] | null;
      const collegeName = Array.isArray(collegeRel) ? collegeRel[0]?.name : collegeRel?.name;
      setStatus({
        state: "pending",
        collegeId: pending.college_id as string,
        collegeName: collegeName ?? "",
        requestId: pending.id as string,
      });
      setLoading(false);
      return;
    }

    setStatus({ state: "none" });
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (!initialState) refresh();
    // Only re-run automatically when the user changes; `initialState` is a
    // one-time seed, not a dependency to keep re-syncing against.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`college-status-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "college_join_requests", filter: `student_id=eq.${userId}` },
        () => refresh()
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${userId}` },
        () => refresh()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, refresh]);

  return { status, loading, refresh };
}
