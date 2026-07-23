import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { summarizeWithRoutedModel } from '@/lib/ai/summary-router';
import { checkAiMessageLimit } from '@/lib/rate-limit';
import type { SubscriptionTier } from '@/types';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ status: 'error', error: 'Authentication is required' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('subscription_tier').eq('id', user.id).single();
    const tier = (profile?.subscription_tier as SubscriptionTier) || 'FREE';
    if (tier === 'FREE') {
      return NextResponse.json({ status: 'error', error: 'AI Summary is available on Pro.' }, { status: 403 });
    }
    const limitCheck = await checkAiMessageLimit(user.id, tier, 'book_summary');
    if (!limitCheck.success) return NextResponse.json({ status: 'error', error: 'The daily AI limit has been reached.' }, { status: 429 });

    const { title, description, subjectName, fileType, extractedText } = await req.json();
    if (!title) return NextResponse.json({ status: 'error', error: 'Book title is required' }, { status: 400 });

    const sourceText = [
      `Title: ${title}`,
      `Subject: ${subjectName || 'Unknown'}`,
      `File type: ${fileType || 'document'}`,
      `Description: ${description || '(none provided)'}`,
      typeof extractedText === 'string' && extractedText.trim() ? `Extracted text:\n${extractedText.trim()}` : '',
    ].filter(Boolean).join('\n\n');

    const result = await summarizeWithRoutedModel({
      text: sourceText,
      system: 'You are ilm AI, helping Pakistani board-exam students quickly understand a book/notes file before they open it. Write a well-structured Markdown summary using real headings (##), bold key terms, and bullet lists - never a flat wall of text. Keep it useful and skimmable.',
      prompt: (content) => `Give a short overview summary for this library resource so a student knows what to expect before opening it.

${content}

Structure your Markdown response with:
## What This Book Is About
(2-3 sentences on what this resource covers)
## Key Topics
(bullet list of 4-6 important topics/chapters)
## Who Will Benefit From This Book
(1-2 sentences on which students should read this)

If no extracted text is available, reason from the title/subject/description sensibly and do not invent specific page numbers or exact contents you cannot know.`,
      maxTokens: 600,
      temperature: 0.5,
    });

    return NextResponse.json({
      status: 'success',
      data: { summary: result.text, provider: result.provider, routeReason: result.routeReason },
    });
  } catch (error) {
    console.error('Book summary error:', error);
    return NextResponse.json({ status: 'error', error: 'The summary could not be generated' }, { status: 500 });
  }
}
