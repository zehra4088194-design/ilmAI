import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/parent/messages?linkId=xxx -> message history for a parent<->student link
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const linkId = req.nextUrl.searchParams.get('linkId');
  if (!linkId) return NextResponse.json({ error: 'linkId required hai' }, { status: 400 });

  const { data, error } = await supabase
    .from('parent_messages')
    .select('*')
    .eq('link_id', linkId)
    .order('created_at', { ascending: true })
    .limit(200);

  if (error) return NextResponse.json({ error: 'Messages load nahi hue' }, { status: 500 });
  return NextResponse.json({ messages: data });
}

// POST /api/parent/messages  body: { linkId, content }
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const { linkId, content } = await req.json();
  if (!linkId || !content?.trim()) {
    return NextResponse.json({ error: 'linkId aur content required hain' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('parent_messages')
    .insert({ link_id: linkId, sender_id: user.id, content: content.trim() })
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'Message send nahi hua' }, { status: 500 });
  return NextResponse.json({ message: data });
}
