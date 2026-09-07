import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { createNotificationIfEnabled } from '@/lib/notifications/preferences';
import { getParentLinkAccess } from '@/lib/parent/access';
import { deleteChatArchive, loadArchivedChatMessages, mergeChatMessages } from '@/lib/storage/chat-archive';
import { resolveAttachmentSignedUrl, uploadChatAttachment } from '@/lib/storage/chat-attachments';

async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const linkId = req.nextUrl.searchParams.get('linkId');
  if (!linkId) return NextResponse.json({ error: 'A link ID is required' }, { status: 400 });
  const access = await getParentLinkAccess(linkId, user.id);
  if (!access) return NextResponse.json({ error: 'This link does not belong to your account.' }, { status: 403 });
  if (!access.plan.access.parentDashboard) {
    return NextResponse.json(
      { error: 'Parent chat is available when the linked student has a Pro or Elite plan.' },
      { status: 403 }
    );
  }

  const chatsAdmin = createServiceClient() as any;
  await chatsAdmin
    .from('parent_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('link_id', linkId)
    .neq('sender_id', user.id)
    .is('read_at', null);

  const { data, error } = await chatsAdmin
    .from('parent_messages')
    .select('*')
    .eq('link_id', linkId)
    .order('created_at', { ascending: true })
    .limit(200);

  if (error) return NextResponse.json({ error: 'Messages could not be loaded.' }, { status: 500 });
  const archived = await loadArchivedChatMessages<any>(chatsAdmin, 'parent', linkId);
  const merged = mergeChatMessages(archived, data || []);
  const messages = await Promise.all(
    merged.map(async (m: any) => ({ ...m, attachment_signed_url: await resolveAttachmentSignedUrl(m.attachment_url) }))
  );
  return NextResponse.json({ messages });
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const contentType = req.headers.get('content-type') || '';
  let linkId: string | null = null;
  let content = '';
  let file: File | null = null;
  if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData();
    linkId = (formData.get('linkId') as string | null) || null;
    content = ((formData.get('content') as string | null) || '').trim();
    file = (formData.get('file') as File | null) || null;
  } else {
    const body = await req.json();
    linkId = body.linkId || null;
    content = typeof body.content === 'string' ? body.content.trim() : '';
  }
  if (!linkId || (!content && !file)) {
    return NextResponse.json({ error: 'A link ID and message or file are required' }, { status: 400 });
  }

  const access = await getParentLinkAccess(linkId, user.id);
  if (!access || !access.link.student_id)
    return NextResponse.json({ error: 'This link does not belong to your account.' }, { status: 403 });
  if (!access.plan.access.parentDashboard) {
    return NextResponse.json(
      { error: 'Parent chat is available when the linked student has a Pro or Elite plan.' },
      { status: 403 }
    );
  }
  const { link } = access;

  let attachment: { url: string; name: string; type: string; sizeKb: number } | null = null;
  if (file) {
    try {
      attachment = await uploadChatAttachment(file, `parent-chat/${linkId}`);
    } catch (uploadError) {
      return NextResponse.json(
        { error: uploadError instanceof Error ? uploadError.message : 'The file could not be uploaded.' },
        { status: 400 }
      );
    }
  }

  const chatsAdmin = createServiceClient() as any;
  const { data, error } = await chatsAdmin
    .from('parent_messages')
    .insert({
      link_id: linkId,
      sender_id: user.id,
      content,
      attachment_url: attachment?.url || null,
      attachment_name: attachment?.name || null,
      attachment_type: attachment?.type || null,
      attachment_size_kb: attachment?.sizeKb || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'The message could not be sent.' }, { status: 500 });
  data.attachment_signed_url = await resolveAttachmentSignedUrl(data.attachment_url);

  const recipientId = user.id === link.parent_id ? link.student_id : link.parent_id;
  if (!recipientId) return NextResponse.json({ error: 'The linked recipient was not found.' }, { status: 409 });
  const admin = await createAdminClient();
  await createNotificationIfEnabled(admin, 'parentMessages', {
    user_id: recipientId,
    type: 'SOCIAL',
    title: 'New parent message',
    message: content ? content.slice(0, 120) : `Sent a file: ${attachment?.name || 'attachment'}`,
    link:
      user.id === link.parent_id
        ? `/settings?tab=parent-link&linkId=${encodeURIComponent(linkId)}&view=chat`
        : `/parent?linkId=${encodeURIComponent(linkId)}&view=chat`,
    is_read: false,
  });

  return NextResponse.json({ message: data });
}

export async function PATCH(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const { linkId } = await req.json();
  if (!linkId) return NextResponse.json({ error: 'A link ID is required' }, { status: 400 });

  const access = await getParentLinkAccess(linkId, user.id);
  if (!access) return NextResponse.json({ error: 'This link does not belong to your account.' }, { status: 403 });
  if (!access.plan.access.parentDashboard) {
    return NextResponse.json(
      { error: 'Parent chat is available when the linked student has a Pro or Elite plan.' },
      { status: 403 }
    );
  }

  const chatsAdmin = createServiceClient() as any;
  const { error } = await chatsAdmin
    .from('parent_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('link_id', linkId)
    .neq('sender_id', user.id)
    .is('read_at', null);

  if (error) return NextResponse.json({ error: 'The read status could not be updated.' }, { status: 500 });
  return NextResponse.json({ status: 'success' });
}

// Clears this chat's history (live rows + archived ones) — deliberately does NOT touch the
// parent_student_links row itself, since that's the actual parent<->student relationship, not
// just a chat thread. Either the parent or the linked student may clear it, same as GET/POST above.
export async function DELETE(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const linkId = req.nextUrl.searchParams.get('linkId');
  if (!linkId) return NextResponse.json({ error: 'A link ID is required' }, { status: 400 });
  const access = await getParentLinkAccess(linkId, user.id);
  if (!access) return NextResponse.json({ error: 'This link does not belong to your account.' }, { status: 403 });

  const chatsAdmin = createServiceClient() as any;
  const { error } = await chatsAdmin.from('parent_messages').delete().eq('link_id', linkId);
  if (error) return NextResponse.json({ error: 'The chat could not be deleted.' }, { status: 500 });

  await deleteChatArchive(chatsAdmin, 'parent', linkId).catch((err) =>
    console.error('Parent chat archive cleanup failed:', err)
  );

  return NextResponse.json({ success: true });
}
