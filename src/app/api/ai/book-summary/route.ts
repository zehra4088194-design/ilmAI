import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { gatewayChat } from '@/lib/ai/gateway';
import { checkAiMessageLimit } from '@/lib/rate-limit';
import type { SubscriptionTier } from '@/types';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ status: 'error', error: 'Login required hai' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('subscription_tier').eq('id', user.id).single();
    const tier = (profile?.subscription_tier as SubscriptionTier) || 'FREE';
    const limitCheck = await checkAiMessageLimit(user.id, tier);
    if (!limitCheck.success) return NextResponse.json({ status: 'error', error: 'Daily AI limit khatam ho gayi' }, { status: 429 });

    const { title, description, subjectName, fileType } = await req.json();
    if (!title) return NextResponse.json({ status: 'error', error: 'Book title zaroori hai' }, { status: 400 });

    const result = await gatewayChat({
      provider: 'groq',
      tier: 'mini',
      messages: [
        {
          role: 'system',
          content: 'You are ilm AI, helping Pakistani board-exam students quickly understand a book/notes file before they open it. Write a well-structured Markdown summary using real headings (##), bold key terms, and bullet lists — never a flat wall of text. Keep it useful and skimmable.',
        },
        {
          role: 'user',
          content: `Give a short overview summary for this library resource so a student knows what to expect before opening it.\nTitle: ${title}\nSubject: ${subjectName || 'Unknown'}\nFile type: ${fileType || 'document'}\nDescription: ${description || '(none provided)'}\n\nStructure your Markdown response with:\n## Kis Baare Mein Hai\n(2-3 sentences on what this resource likely covers)\n## Key Topics\n(bullet list of 4-6 likely topics/chapters based on the title/subject)\n## Kis Ke Liye Faidmand Hai\n(1-2 sentences on which students should read this)\n\nIf the description doesn't give enough detail, reason from the title and subject sensibly, and don't invent specific page numbers or exact contents you can't know.`,
        },
      ],
      maxTokens: 600,
      temperature: 0.5,
    });

    return NextResponse.json({ status: 'success', data: { summary: result.text } });
  } catch (error) {
    console.error('Book summary error:', error);
    return NextResponse.json({ status: 'error', error: 'Summary generate nahi hui' }, { status: 500 });
  }
}
