import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { createNotificationIfEnabled } from '@/lib/notifications/preferences';
import { getParentLinkAccess } from '@/lib/parent/access';
import { checkParentAttachmentLimits } from '@/lib/rate-limit';
import { deleteR2Object, getR2Uri, isR2Configured, parseR2Uri, putR2Object } from '@/lib/storage/r2';

export const runtime = 'nodejs';
export const maxDuration = 30;

const BUCKET = 'parent-attachments';
const MAX_FILE_SIZE = 4 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];
const SIGNED_URL_TTL = 60 * 60; // 1 hour

async function ensureBucket(admin: Awaited<ReturnType<typeof createAdminClient>>) {
  const { error } = await admin.storage.getBucket(BUCKET);
  if (!error) return;
  const { error: createError } = await admin.storage.createBucket(BUCKET, {
    public: false,
    fileSizeLimit: MAX_FILE_SIZE,
    allowedMimeTypes: ALLOWED_TYPES,
  });
  if (createError && !/already exists/i.test(createError.message || '')) throw createError;
}

// GET /api/parent/attachments?linkId=xxx -> list attachments for a link, each with a fresh signed URL
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ status: 'error', error: 'Login required' }, { status: 401 });

    const linkId = req.nextUrl.searchParams.get('linkId');
    if (!linkId) return NextResponse.json({ status: 'error', error: 'A link ID is required' }, { status: 400 });

    const access = await getParentLinkAccess(linkId, user.id);
    if (!access)
      return NextResponse.json(
        { status: 'error', error: 'This link does not belong to your account.' },
        { status: 403 }
      );
    if (!access.plan.access.parentDashboard || access.plan.limits.parentAttachmentFilesMonthly <= 0) {
      return NextResponse.json(
        { status: 'error', error: "Parent-shared files are available with the linked student's Pro or Elite plan." },
        { status: 403 }
      );
    }

    const { admin } = access;
    const { data, error } = await admin
      .from('parent_attachments')
      .select('*')
      .eq('link_id', linkId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Attachments list error:', error);
      return NextResponse.json({ status: 'error', error: 'Files could not be loaded' }, { status: 500 });
    }

    const withUrls = await Promise.all(
      (data || []).map(async (att) => {
        if (parseR2Uri(att.file_url)) {
          return { ...att, signed_url: `/api/parent/attachments/file?id=${encodeURIComponent(att.id)}` };
        }
        const { data: signed } = await admin.storage.from(BUCKET).createSignedUrl(att.file_url, SIGNED_URL_TTL);
        return { ...att, signed_url: signed?.signedUrl || null };
      })
    );

    return NextResponse.json({ status: 'success', data: withUrls });
  } catch (error) {
    console.error('Attachments GET error:', error);
    return NextResponse.json({ status: 'error', error: 'Something went wrong.' }, { status: 500 });
  }
}

// POST /api/parent/attachments  multipart/form-data: linkId, file, caption?
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ status: 'error', error: 'Login required' }, { status: 401 });

    const formData = await req.formData();
    const linkId = formData.get('linkId') as string | null;
    const file = formData.get('file') as File | null;
    const caption = (formData.get('caption') as string | null)?.trim() || null;

    if (!linkId || !file) {
      return NextResponse.json({ status: 'error', error: 'A link ID and file are required' }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ status: 'error', error: 'The file must not exceed 4 MB' }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ status: 'error', error: 'Only images and PDF files are allowed' }, { status: 400 });
    }

    // Validate the authenticated sender before using the service-role client.
    const access = await getParentLinkAccess(linkId, user.id);
    if (!access) {
      return NextResponse.json(
        { status: 'error', error: 'This link does not belong to your account.' },
        { status: 403 }
      );
    }
    if (!access.plan.access.parentDashboard || access.plan.limits.parentAttachmentFilesMonthly <= 0) {
      return NextResponse.json(
        { status: 'error', error: "Parent file sharing is available with the linked student's Pro or Elite plan." },
        { status: 403 }
      );
    }
    const { admin, link } = access;
    const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin';
    const path = `${linkId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const useR2 = isR2Configured();
    let r2Key: string | null = null;
    let storedPath = path;
    if (useR2) {
      r2Key = `parent-attachments/${path}`;
      await putR2Object(r2Key, buffer, {
        contentType: file.type,
        cacheControl: 'private, max-age=0, no-store',
      });
      storedPath = getR2Uri(r2Key);
    } else {
      await ensureBucket(admin);
      const { error: uploadError } = await admin.storage
        .from(BUCKET)
        .upload(path, buffer, { contentType: file.type, upsert: false });
      if (uploadError) {
        console.error('Attachment upload error:', uploadError);
        return NextResponse.json({ status: 'error', error: 'The file could not be uploaded' }, { status: 500 });
      }
    }

    const quota = await checkParentAttachmentLimits(link.student_id!, access.tier, file.size);
    if (!quota.success) {
      if (r2Key) await deleteR2Object(r2Key);
      else await admin.storage.from(BUCKET).remove([path]);
      return NextResponse.json(
        {
          status: 'error',
          error: `This month's parent file limit has been reached (${access.plan.limits.parentAttachmentFilesMonthly} files / ${access.plan.limits.parentAttachmentMegabytesMonthly} MB).`,
        },
        { status: 429 }
      );
    }

    const { data: record, error: insertError } = await admin
      .from('parent_attachments')
      .insert({
        link_id: linkId,
        sender_id: user.id,
        file_url: storedPath,
        file_name: file.name,
        file_type: file.type,
        file_size_kb: Math.max(1, Math.round(file.size / 1024)),
        caption,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Attachment insert error:', insertError);
      if (r2Key) await deleteR2Object(r2Key);
      else await admin.storage.from(BUCKET).remove([path]);
      return NextResponse.json({ status: 'error', error: 'The attachment could not be saved' }, { status: 500 });
    }

    const recipientId = user.id === link.parent_id ? link.student_id : link.parent_id;
    if (!recipientId) {
      return NextResponse.json({ status: 'error', error: 'The linked student was not found' }, { status: 409 });
    }
    await createNotificationIfEnabled(admin, 'parentMessages', {
      user_id: recipientId,
      type: 'SOCIAL',
      title: 'New parent file',
      message: `${file.name} was shared.`,
      link:
        user.id === link.parent_id
          ? `/settings?tab=parent-link&linkId=${encodeURIComponent(linkId)}&view=files`
          : `/parent?linkId=${encodeURIComponent(linkId)}&view=files`,
      is_read: false,
    });

    const signedUrl = useR2
      ? `/api/parent/attachments/file?id=${encodeURIComponent(record.id)}`
      : (await admin.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL)).data?.signedUrl || null;

    return NextResponse.json({ status: 'success', data: { ...record, signed_url: signedUrl } });
  } catch (error) {
    console.error('Attachment POST error:', error);
    return NextResponse.json({ status: 'error', error: 'Something went wrong.' }, { status: 500 });
  }
}
