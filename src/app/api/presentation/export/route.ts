import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { exportPresentationToPptx } from '@/lib/presentation/pptx-export';

export const runtime = 'nodejs';
export const maxDuration = 60;

function filenameFromTopic(topic: unknown) {
  const base = typeof topic === 'string' && topic.trim() ? topic.trim() : 'ilm-ai-presentation';
  return `${base.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'ilm-ai-presentation'}.pptx`;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ status: 'error', error: 'Login required' }, { status: 401 });

    const body = await req.json();
    const deck = body.deck;
    const buffer = await exportPresentationToPptx(deck);
    const filename = filenameFromTopic(deck?.topic);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Presentation export route error:', error);
    return NextResponse.json({ status: 'error', error: 'The PPTX export could not be completed.' }, { status: 500 });
  }
}
