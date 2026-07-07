import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

const BUCKET = 'parent-attachments';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];
const SIGNED_URL_TTL = 60 * 60; // 1 hour

// GET /api/parent/attachments?linkId=xxx -> list attachments for a link, each with a fresh signed URL
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ status: 'error', error: 'Login required' }, { status: 401 });

    const linkId = req.nextUrl.searchParams.get('linkId');
    if (!linkId) return NextResponse.json({ status: 'error', error: 'linkId required hai' }, { status: 400 });

    const { data, error } = await supabase
      .from('parent_attachments')
      .select('*')
      .eq('link_id', linkId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Attachments list error:', error);
      return NextResponse.json({ status: 'error', error: 'Files load nahi hui' }, { status: 500 });
    }

    const withUrls = await Promise.all(
      (data || []).map(async (att) => {
        const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(att.file_url, SIGNED_URL_TTL);
        return { ...att, signed_url: signed?.signedUrl || null };
      })
    );

    return NextResponse.json({ status: 'success', data: withUrls });
  } catch (error) {
    console.error('Attachments GET error:', error);
    return NextResponse.json({ status: 'error', error: 'Kuch ghalat ho gaya' }, { status: 500 });
  }
}

// POST /api/parent/attachments  multipart/form-data: linkId, file, caption?
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ status: 'error', error: 'Login required' }, { status: 401 });

    const formData = await req.formData();
    const linkId = formData.get('linkId') as string | null;
    const file = formData.get('file') as File | null;
    const caption = (formData.get('caption') as string | null)?.trim() || null;

    if (!linkId || !file) {
      return NextResponse.json({ status: 'error', error: 'linkId aur file required hain' }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ status: 'error', error: 'File 10MB se bari nahi honi chahiye' }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ status: 'error', error: 'Sirf images ya PDF allowed hain' }, { status: 400 });
    }

    // Defense in depth on top of RLS + storage policies: confirm the sender
    // is actually a party of this approved link before we touch storage.
    const { data: link } = await supabase
      .from('parent_student_links')
      .select('id, parent_id, student_id, status')
      .eq('id', linkId)
      .maybeSingle();

    if (!link || link.status !== 'approved' || (link.parent_id !== user.id && link.student_id !== user.id)) {
      return NextResponse.json({ status: 'error', error: 'Ye link aapka nahi hai' }, { status: 403 });
    }

    const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin';
    const path = `${linkId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: file.type, upsert: false });

    if (uploadError) {
      console.error('Attachment upload error:', uploadError);
      return NextResponse.json({ status: 'error', error: 'File upload nahi hui' }, { status: 500 });
    }

    const { data: record, error: insertError } = await supabase
      .from('parent_attachments')
      .insert({
        link_id: linkId,
        sender_id: user.id,
        file_url: path,
        file_name: file.name,
        file_type: file.type,
        file_size_kb: Math.max(1, Math.round(file.size / 1024)),
        caption,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Attachment insert error:', insertError);
      // Best-effort cleanup so we don't leave an orphaned file in storage
      await supabase.storage.from(BUCKET).remove([path]);
      return NextResponse.json({ status: 'error', error: 'Attachment save nahi hui' }, { status: 500 });
    }

    const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL);

    return NextResponse.json({ status: 'success', data: { ...record, signed_url: signed?.signedUrl || null } });
  } catch (error) {
    console.error('Attachment POST error:', error);
    return NextResponse.json({ status: 'error', error: 'Kuch ghalat ho gaya' }, { status: 500 });
  }
}
