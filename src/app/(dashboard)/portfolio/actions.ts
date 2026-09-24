'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);
}

export async function savePortfolioSettings(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: 'error', error: 'Login required' };
  const isPublic = formData.get('is_public') === 'on';
  const publicSlug = slugify(String(formData.get('public_slug') || user.email?.split('@')[0] || 'student'));
  const payload = {
    student_id: user.id,
    is_public: isPublic,
    public_slug: publicSlug || null,
    headline: String(formData.get('headline') || '').slice(0, 140),
    bio: String(formData.get('bio') || '').slice(0, 1200),
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from('portfolio_settings' as any).upsert(payload, { onConflict: 'student_id' });
  if (error) return { status: 'error', error: error.message };
  revalidatePath('/portfolio');
  revalidatePath('/portfolio/edit');
  if (payload.public_slug) revalidatePath(`/p/${payload.public_slug}`);
  return { status: 'success' };
}

export async function generatePortfolioResumeSummary() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 'Login required';
  const [{ data: profile }, { data: achievements }, { data: twin }] = await Promise.all([
    supabase.from('profiles').select('full_name, xp, level, streak, board, grade_level').eq('id', user.id).single(),
    supabase.from('user_achievements').select('achievements(name, description)').eq('user_id', user.id).limit(8),
    supabase.from('student_digital_twin' as any).select('strengths, confidence_level').eq('student_id', user.id).maybeSingle(),
  ]);
  return [
    `# ${profile?.full_name || 'Student'} - Learning Portfolio`,
    '',
    `Level ${profile?.level || 1} | ${profile?.xp || 0} XP | ${profile?.streak || 0} day streak`,
    `Board/Class: ${profile?.board || 'N/A'} ${profile?.grade_level || ''}`,
    '',
    '## Strengths',
    Object.entries(((twin as any)?.strengths || {}) as Record<string, number>).slice(0, 5).map(([key, value]) => `- ${key}: ${value}% confidence`).join('\n') || '- Building strength profile through quizzes.',
    '',
    '## Achievements',
    (achievements || []).map((row: any) => `- ${row.achievements?.name}: ${row.achievements?.description}`).join('\n') || '- Achievements in progress.',
  ].join('\n');
}
