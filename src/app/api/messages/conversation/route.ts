import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const otherProfileId = String(body.otherProfileId || '').trim();
  if (!otherProfileId || otherProfileId === user.id) {
    return NextResponse.json({ error: 'Choose another user.' }, { status: 400 });
  }

  const db = supabase as any;
  const { data: other } = await db.from('profiles').select('id').eq('id', otherProfileId).maybeSingle();
  if (!other) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

  const { data: conversation, error } = await db.rpc('get_or_create_direct_conversation', {
    p_context_type: 'consumer',
    p_organization_id: null,
    p_relationship_type: 'consumer_peer',
    p_other_profile_id: otherProfileId,
  });
  if (error) return NextResponse.json({ error: error.message || 'Conversation could not be created.' }, { status: 500 });

  return NextResponse.json({ conversation });
}
