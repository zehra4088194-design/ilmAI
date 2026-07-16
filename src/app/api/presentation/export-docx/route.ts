import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { exportPresentationToDocx } from '@/lib/presentation/docx-export';

export const runtime = 'nodejs';
export const maxDuration = 60;

function filenameFromTopic(topic: unknown) {
  const base = typeof topic === 'string' && topic.trim() ? topic.trim() : 'ilm-ai-presentation';
  return `${base.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'ilm-ai-presentation'}.docx`;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ status: 'error', error: 'Login required' }, { status: 401 });

    const body = await req.json();
    const deck = body.deck;
    const buffer = await exportPresentationToDocx(deck);
    const filename = filenameFromTopic(deck?.topic);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Presentation DOCX export route error:', error);
    return NextResponse.json({ status: 'error', error: 'DOCX export nahi ho saka.' }, { status: 500 });
  }
}
