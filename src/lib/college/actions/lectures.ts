'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { isValidLectureVideoUrl } from '@/lib/college/validators';
import type { ActionResult } from '@/lib/college/types';

interface LectureInput {
  collegeId: string;
  title: string;
  description: string;
  stream: string;
  degreeName: string;
  courseName: string;
  semester: string;
  chapterTitle: string;
  videoUrl: string;
}

function readLectureInput(formData: FormData): LectureInput {
  return {
    collegeId: String(formData.get('collegeId') ?? ''),
    title: String(formData.get('title') ?? '').trim(),
    description: String(formData.get('description') ?? '').trim(),
    stream: String(formData.get('stream') ?? '').trim(),
    degreeName: String(formData.get('degreeName') ?? '').trim(),
    courseName: String(formData.get('courseName') ?? '').trim(),
    semester: String(formData.get('semester') ?? '').trim(),
    chapterTitle: String(formData.get('chapterTitle') ?? '').trim(),
    videoUrl: String(formData.get('videoUrl') ?? '').trim(),
  };
}

export async function createLecture(formData: FormData): Promise<ActionResult> {
  const input = readLectureInput(formData);
  if (!input.title) return { success: false, error: 'Title is required.' };
  if (!isValidLectureVideoUrl(input.videoUrl)) {
    return { success: false, error: 'Enter a valid YouTube or Google Drive link.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'You need to sign in first.' };
  const db = supabase as any;

  const { error } = await db.from('college_lectures').insert({
    college_id: input.collegeId,
    uploaded_by: user.id,
    title: input.title,
    description: input.description || null,
    stream: input.stream || null,
    degree_name: input.degreeName || null,
    course_name: input.courseName || null,
    semester: input.semester || null,
    chapter_title: input.chapterTitle || null,
    video_url: input.videoUrl,
  });

  if (error) return { success: false, error: 'Could not add the lecture. Please try again.' };

  revalidatePath('/college-admin/lectures');
  revalidatePath('/college/dashboard');
  return { success: true };
}

export async function updateLecture(lectureId: string, formData: FormData): Promise<ActionResult> {
  const input = readLectureInput(formData);
  if (!input.title) return { success: false, error: 'Title is required.' };
  if (!isValidLectureVideoUrl(input.videoUrl)) {
    return { success: false, error: 'Enter a valid YouTube or Google Drive link.' };
  }

  const supabase = await createClient();
  const db = supabase as any;
  const { error } = await db
    .from('college_lectures')
    .update({
      title: input.title,
      description: input.description || null,
      stream: input.stream || null,
      degree_name: input.degreeName || null,
      course_name: input.courseName || null,
      semester: input.semester || null,
      chapter_title: input.chapterTitle || null,
      video_url: input.videoUrl,
    })
    .eq('id', lectureId);

  if (error) return { success: false, error: 'Could not update the lecture. Please try again.' };

  revalidatePath('/college-admin/lectures');
  revalidatePath('/college/dashboard');
  return { success: true };
}

export async function deleteLecture(lectureId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const db = supabase as any;
  const { error } = await db.from('college_lectures').delete().eq('id', lectureId);
  if (error) return { success: false, error: 'Could not delete the lecture. Please try again.' };

  revalidatePath('/college-admin/lectures');
  revalidatePath('/college/dashboard');
  return { success: true };
}
