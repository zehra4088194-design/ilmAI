import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { gatewayChat } from '@/lib/ai/gateway';
import { checkAiMessageLimit } from '@/lib/rate-limit';
import { parseAiJson } from '@/lib/utils/json-extract';
import type { SubscriptionTier } from '@/types';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ status: 'error', error: 'Login required' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('subscription_tier').eq('id', user.id).single();
    const tier = (profile?.subscription_tier as SubscriptionTier) || 'FREE';
    const limitCheck = await checkAiMessageLimit(user.id, tier, 'routine');
    if (!limitCheck.success) return NextResponse.json({ status: 'error', error: 'Daily AI limit khatam ho gayi' }, { status: 429 });

    const { preferences } = await req.json();
    const { availableDays, hoursPerDay, preferredTime, subjects, examDate, weakSubjects, goals } = preferences;

    const prompt = `Create a realistic weekly study schedule for a Pakistani board exam student with these details:
Available days: ${availableDays?.join(', ') || 'all days'}
Hours per day: ${hoursPerDay || 3}
Preferred time: ${preferredTime || 'flexible'}
Subjects: ${subjects?.join(', ') || 'Physics, Chemistry, Mathematics'}
Exam date: ${examDate || 'not specified'}
Weak subjects: ${weakSubjects?.join(', ') || 'none mentioned'}
Goals: ${goals || 'score well in board exams'}

Return ONLY valid JSON, no extra text:
{
  "weeklySchedule": [
    {
      "day": "Monday",
      "sessions": [
        {"subject": "Mathematics", "topic": "Quadratic Equations", "duration": 60, "type": "new_concept", "priority": "high"},
        {"subject": "Physics", "topic": "Review previous notes", "duration": 30, "type": "revision", "priority": "medium"}
      ]
    }
  ],
  "studyTips": ["tip1", "tip2", "tip3"],
  "weeklyGoals": ["goal1", "goal2"],
  "totalHours": 21,
  "examStrategy": "brief strategy based on exam date"
}`;

    const result = await gatewayChat({ provider: 'groq', tier: 'medium', messages: [{ role: 'user', content: prompt }], maxTokens: 2048, temperature: 0.4 });
    const parsed = parseAiJson(result.text, { weeklySchedule: [], studyTips: [], weeklyGoals: [], totalHours: 0, examStrategy: '' });

    // Save routine to database
    await supabase.from('study_routines').upsert({ user_id: user.id, preferences, schedule: parsed, generated_by_provider: result.providerUsed });

    return NextResponse.json({ status: 'success', data: parsed });
  } catch (error) {
    console.error('Routine generation error:', error);
    return NextResponse.json({ status: 'error', error: 'Schedule generate nahi ho saka' }, { status: 500 });
  }
}
