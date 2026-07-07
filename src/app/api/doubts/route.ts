import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { nanoid } from 'nanoid';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ status: 'error', error: 'Login required' }, { status: 401 });

    const { title, body, subjectId } = await req.json();
    if (!title?.trim() || !body?.trim()) return NextResponse.json({ status: 'error', error: 'Title aur sawaal dono likhna zaroori hai' }, { status: 400 });

    const id = nanoid();
    const { data, error } = await supabase.from('doubts').insert({
      id, student_id: user.id, title: title.trim(), body: body.trim(),
      subject_id: subjectId || null, is_resolved: false,
    }).select().single();

    if (error) throw error;

    // Auto-generate an AI teacher reply (teacher is AI-operated, student can't tell)
    try {
      const { gatewayChat, MARKDOWN_ANSWER_FORMAT_INSTRUCTION } = await import('@/lib/ai/gateway');
      const aiReply = await gatewayChat({
        provider: 'groq', tier: 'medium',
        messages: [
          { role: 'system', content: `You are an expert Pakistani board exam teacher (Class 9-12). Answer student doubts clearly, patiently, and encouragingly. Use simple English with some Roman Urdu. Be thorough but concise.\n\n${MARKDOWN_ANSWER_FORMAT_INSTRUCTION}` },
          { role: 'user', content: `Student question: ${title}\n\nDetails: ${body}` },
        ],
        maxTokens: 1024, temperature: 0.6,
      });

      // Find or create the AI teacher profile
      const { data: aiTeacher } = await supabase.from('profiles').select('id').eq('is_ai_operated', true).eq('role', 'teacher').limit(1).single();
      if (aiTeacher) {
        await supabase.from('doubt_replies').insert({
          id: nanoid(), doubt_id: id, teacher_id: aiTeacher.id,
          body: aiReply.text, is_accepted: false,
        });
      }
    } catch (aiErr) {
      console.error('AI teacher reply failed (non-fatal):', aiErr);
    }

    return NextResponse.json({ status: 'success', data });
  } catch (error) {
    console.error('Doubt post error:', error);
    return NextResponse.json({ status: 'error', error: 'Sawaal post nahi ho saka' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);
    const subjectId = searchParams.get('subject');
    let query = supabase.from('doubts').select('*, profiles(full_name, avatar_url), doubt_replies(id, body, is_accepted, created_at, profiles(full_name, is_ai_operated))').order('created_at', { ascending: false }).limit(30);
    if (subjectId) query = query.eq('subject_id', subjectId);
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ status: 'success', data });
  } catch (error) {
    return NextResponse.json({ status: 'error', error: 'Doubts load nahi ho sake' }, { status: 500 });
  }
}
