'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function saveCareerProfile(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: 'error', error: 'Login required' };
  const interests = String(formData.get('interests') || '').split(',').map((item) => item.trim()).filter(Boolean);
  const personality_traits = {
    analytical: Number(formData.get('analytical') || 5),
    creative: Number(formData.get('creative') || 5),
    social: Number(formData.get('social') || 5),
    practical: Number(formData.get('practical') || 5),
    leadership: Number(formData.get('leadership') || 5),
    detail_oriented: Number(formData.get('detail_oriented') || 5),
    entrepreneurial: Number(formData.get('entrepreneurial') || 5),
    research_minded: Number(formData.get('research_minded') || 5),
  };
  const { error } = await supabase.from('career_profile_inputs' as any).upsert({
    student_id: user.id,
    interests,
    personality_traits,
    learning_style_override: formData.get('learning_style_override') || null,
    budget_range: formData.get('budget_range') || 'flexible',
    preferred_city: formData.get('preferred_city') || null,
    preferred_university: formData.get('preferred_university') || null,
    study_abroad_interest: formData.get('study_abroad_interest') === 'on',
    long_term_goal: formData.get('long_term_goal') || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'student_id' });
  if (error) return { status: 'error', error: error.message };
  revalidatePath('/career');
  return { status: 'success' };
}
