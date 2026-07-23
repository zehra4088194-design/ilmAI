'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { ActionResult, CollegeResourceType } from '@/lib/college/types';

const VALID_TYPES: CollegeResourceType[] = ['notes', 'past_paper', 'slides', 'other'];

function isHttpsUrl(value: string) {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

export async function createResource(formData: FormData): Promise<ActionResult> {
  const collegeId = String(formData.get('collegeId') ?? '');
  const title = String(formData.get('title') ?? '').trim();
  const resourceType = String(formData.get('resourceType') ?? '') as CollegeResourceType;
  const stream = String(formData.get('stream') ?? '').trim();
  const degreeName = String(formData.get('degreeName') ?? '').trim();
  const courseName = String(formData.get('courseName') ?? '').trim();
  const semester = String(formData.get('semester') ?? '').trim();
  const chapterTitle = String(formData.get('chapterTitle') ?? '').trim();
  const lightFileUrl = String(formData.get('lightFileUrl') ?? '').trim();
  const darkFileUrl = String(formData.get('darkFileUrl') ?? '').trim();
  const contextTextUrl = String(formData.get('contextTextUrl') ?? '').trim();

  if (!title) return { success: false, error: 'Title is required.' };
  if (!VALID_TYPES.includes(resourceType)) return { success: false, error: 'Choose a valid resource type.' };
  if (!isHttpsUrl(lightFileUrl)) return { success: false, error: 'A valid HTTPS link for the light PDF or Drive file is required.' };
  if (darkFileUrl && !isHttpsUrl(darkFileUrl)) return { success: false, error: 'Dark file ka valid HTTPS link do.' };
  if (!isHttpsUrl(contextTextUrl)) return { success: false, error: 'A valid HTTPS link for the companion .txt file is required.' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'You need to sign in first.' };

  const db = supabase as any;
  const { error } = await db.from('college_resources').insert({
    college_id: collegeId,
    uploaded_by: user.id,
    title,
    resource_type: resourceType,
    stream: stream || null,
    degree_name: degreeName || null,
    course_name: courseName || null,
    semester: semester || null,
    chapter_title: chapterTitle || null,
    file_url: lightFileUrl,
    light_file_url: lightFileUrl,
    dark_file_url: darkFileUrl || null,
    context_text_url: contextTextUrl,
  });

  if (error) return { success: false, error: 'Could not save the resource. Please try again.' };

  revalidatePath('/college-admin/resources');
  revalidatePath('/college/dashboard');
  return { success: true };
}

export async function updateResource(resourceId: string, formData: FormData): Promise<ActionResult> {
  const title = String(formData.get('title') ?? '').trim();
  const resourceType = String(formData.get('resourceType') ?? '') as CollegeResourceType;
  const stream = String(formData.get('stream') ?? '').trim();
  const degreeName = String(formData.get('degreeName') ?? '').trim();
  const courseName = String(formData.get('courseName') ?? '').trim();
  const semester = String(formData.get('semester') ?? '').trim();
  const chapterTitle = String(formData.get('chapterTitle') ?? '').trim();
  const lightFileUrl = String(formData.get('lightFileUrl') ?? '').trim();
  const darkFileUrl = String(formData.get('darkFileUrl') ?? '').trim();
  const contextTextUrl = String(formData.get('contextTextUrl') ?? '').trim();

  if (!title) return { success: false, error: 'Title is required.' };
  if (!VALID_TYPES.includes(resourceType)) return { success: false, error: 'Choose a valid resource type.' };
  if (!isHttpsUrl(lightFileUrl)) return { success: false, error: 'A valid HTTPS link for the light PDF or Drive file is required.' };
  if (darkFileUrl && !isHttpsUrl(darkFileUrl)) return { success: false, error: 'Dark file ka valid HTTPS link do.' };
  if (!isHttpsUrl(contextTextUrl)) return { success: false, error: 'A valid HTTPS link for the companion .txt file is required.' };

  const supabase = await createClient();
  const db = supabase as any;
  const { error } = await db
    .from('college_resources')
    .update({
      title,
      resource_type: resourceType,
      stream: stream || null,
      degree_name: degreeName || null,
      course_name: courseName || null,
      semester: semester || null,
      chapter_title: chapterTitle || null,
      file_url: lightFileUrl,
      light_file_url: lightFileUrl,
      dark_file_url: darkFileUrl || null,
      context_text_url: contextTextUrl,
    })
    .eq('id', resourceId);

  if (error) return { success: false, error: 'Could not update the resource. Please try again.' };

  revalidatePath('/college-admin/resources');
  revalidatePath('/college/dashboard');
  return { success: true };
}

export async function deleteResource(resourceId: string, fileUrl: string): Promise<ActionResult> {
  const supabase = await createClient();
  const db = supabase as any;
  const { error } = await db.from('college_resources').delete().eq('id', resourceId);
  if (error) return { success: false, error: 'Could not delete the resource. Please try again.' };

  void fileUrl;

  revalidatePath('/college-admin/resources');
  revalidatePath('/college/dashboard');
  return { success: true };
}
