"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  COLLEGE_RESOURCE_BUCKET,
  tryDeleteCollegeStorageObject,
  uploadCollegeResourceFile,
} from "@/lib/college/storage";
import type { ActionResult, CollegeResourceType } from "@/lib/college/types";

const VALID_TYPES: CollegeResourceType[] = ["notes", "past_paper", "slides", "other"];

export async function createResource(formData: FormData): Promise<ActionResult> {
  const collegeId = String(formData.get("collegeId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const resourceType = String(formData.get("resourceType") ?? "") as CollegeResourceType;
  const courseName = String(formData.get("courseName") ?? "").trim();
  const semester = String(formData.get("semester") ?? "").trim();
  const file = formData.get("file") as File | null;

  if (!title) return { success: false, error: "Title is required." };
  if (!VALID_TYPES.includes(resourceType)) return { success: false, error: "Choose a valid resource type." };
  if (!file || file.size === 0) return { success: false, error: "Choose a file to upload." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "You need to sign in first." };

  let fileUrl: string;
  try {
    fileUrl = await uploadCollegeResourceFile(supabase, collegeId, file);
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Upload failed." };
  }

  const db = supabase as any;
  const { error } = await db.from("college_resources").insert({
    college_id: collegeId,
    uploaded_by: user.id,
    title,
    resource_type: resourceType,
    course_name: courseName || null,
    semester: semester || null,
    file_url: fileUrl,
  });

  if (error) return { success: false, error: "Could not save the resource. Please try again." };

  revalidatePath("/college-admin/resources");
  revalidatePath("/college/dashboard");
  return { success: true };
}

export async function updateResource(resourceId: string, formData: FormData): Promise<ActionResult> {
  const title = String(formData.get("title") ?? "").trim();
  const resourceType = String(formData.get("resourceType") ?? "") as CollegeResourceType;
  const courseName = String(formData.get("courseName") ?? "").trim();
  const semester = String(formData.get("semester") ?? "").trim();

  if (!title) return { success: false, error: "Title is required." };
  if (!VALID_TYPES.includes(resourceType)) return { success: false, error: "Choose a valid resource type." };

  const supabase = await createClient();
  const db = supabase as any;
  const { error } = await db
    .from("college_resources")
    .update({
      title,
      resource_type: resourceType,
      course_name: courseName || null,
      semester: semester || null,
    })
    .eq("id", resourceId);

  if (error) return { success: false, error: "Could not update the resource. Please try again." };

  revalidatePath("/college-admin/resources");
  revalidatePath("/college/dashboard");
  return { success: true };
}

export async function deleteResource(resourceId: string, fileUrl: string): Promise<ActionResult> {
  const supabase = await createClient();
  const db = supabase as any;
  const { error } = await db.from("college_resources").delete().eq("id", resourceId);
  if (error) return { success: false, error: "Could not delete the resource. Please try again." };

  await tryDeleteCollegeStorageObject(supabase, COLLEGE_RESOURCE_BUCKET, fileUrl);

  revalidatePath("/college-admin/resources");
  revalidatePath("/college/dashboard");
  return { success: true };
}
