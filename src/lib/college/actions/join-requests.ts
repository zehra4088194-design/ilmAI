"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/college/types";

export async function requestToJoinCollege(collegeId: string, collegeSlug: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "You need to sign in first." };
  const db = supabase as any;

  const { error } = await db.from("college_join_requests").insert({
    student_id: user.id,
    college_id: collegeId,
  });

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "You already have an active request with a college." };
    }
    return { success: false, error: "Could not send the request. Please try again." };
  }

  revalidatePath("/colleges");
  revalidatePath(`/colleges/${collegeSlug}`);
  return { success: true };
}

export async function cancelJoinRequest(requestId: string, collegeSlug?: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "You need to sign in first." };
  const db = supabase as any;

  const { error } = await db
    .from("college_join_requests")
    .delete()
    .eq("id", requestId)
    .eq("student_id", user.id)
    .eq("status", "pending");

  if (error) return { success: false, error: "Could not cancel the request. Please try again." };

  revalidatePath("/colleges");
  if (collegeSlug) revalidatePath(`/colleges/${collegeSlug}`);
  return { success: true };
}

export async function approveJoinRequest(requestId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "You need to sign in first." };
  const db = supabase as any;

  // RLS (college_admins-membership policy) is the real enforcement here —
  // this update only succeeds if `user` administers this request's college.
  const { error } = await db
    .from("college_join_requests")
    .update({ status: "approved", resolved_at: new Date().toISOString(), resolved_by: user.id })
    .eq("id", requestId)
    .eq("status", "pending");

  if (error) return { success: false, error: "Could not approve this request. Please try again." };

  revalidatePath("/college-admin/requests");
  revalidatePath("/college-admin/students");
  revalidatePath("/college-admin");
  return { success: true };
}

export async function declineJoinRequest(requestId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "You need to sign in first." };
  const db = supabase as any;

  const { error } = await db
    .from("college_join_requests")
    .update({ status: "declined", resolved_at: new Date().toISOString(), resolved_by: user.id })
    .eq("id", requestId)
    .eq("status", "pending");

  if (error) return { success: false, error: "Could not decline this request. Please try again." };

  revalidatePath("/college-admin/requests");
  revalidatePath("/college-admin");
  return { success: true };
}
