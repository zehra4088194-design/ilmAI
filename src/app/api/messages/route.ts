import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Generic direct-messaging inbox, built on top of the direct_conversations /
 * direct_messages tables (Phase 1a foundation — see the migration comment for
 * why these are relationship-agnostic rather than parent/teacher-specific).
 *
 * GET  /api/messages                 -> list the caller's conversations, newest first
 * POST /api/messages                 -> get-or-create a conversation with another profile
 *
 * Per-conversation message read/send lives in /api/messages/[conversationId].
 */

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const db = supabase as any;
  const relationshipType = req.nextUrl.searchParams.get('relationshipType');
  let query = db
    .from('direct_conversations')
    .select(
      'id, context_type, organization_id, relationship_type, participant_one_id, participant_two_id, last_message_at, created_at'
    )
    .or(`participant_one_id.eq.${user.id},participant_two_id.eq.${user.id}`)
    .order('last_message_at', { ascending: false, nullsFirst: false });
  if (relationshipType) query = query.eq('relationship_type', relationshipType);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'Conversations could not be loaded.' }, { status: 500 });

  const otherProfileIds = Array.from(
    new Set((data || []).map((c: any) => (c.participant_one_id === user.id ? c.participant_two_id : c.participant_one_id)))
  );
  const { data: profiles } = otherProfileIds.length
    ? await db.from('profiles').select('id, full_name, avatar_url').in('id', otherProfileIds)
    : { data: [] };
  const profileById = new Map((profiles || []).map((p: any) => [p.id, p]));

  const conversations = (data || []).map((c: any) => {
    const otherId = c.participant_one_id === user.id ? c.participant_two_id : c.participant_one_id;
    return { ...c, otherProfile: profileById.get(otherId) || null };
  });

  return NextResponse.json({ conversations });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const { contextType, organizationId, relationshipType, otherProfileId } = await req.json();
  if (!contextType || !relationshipType || !otherProfileId) {
    return NextResponse.json({ error: 'contextType, relationshipType, and otherProfileId are required' }, { status: 400 });
  }

  const db = supabase as any;
  const { data, error } = await db.rpc('get_or_create_direct_conversation', {
    p_context_type: contextType,
    p_organization_id: organizationId || null,
    p_relationship_type: relationshipType,
    p_other_profile_id: otherProfileId,
  });

  if (error) return NextResponse.json({ error: error.message || 'The conversation could not be started.' }, { status: 403 });
  return NextResponse.json({ conversation: data });
}
