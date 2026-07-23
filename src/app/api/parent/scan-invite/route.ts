import { NextRequest, NextResponse } from 'next/server';
import { buildParentConnectPath, normalizeParentInvitePayload } from '@/lib/parent/invite-code';
import { decodeQrImage } from '@/lib/parent/qr-server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
]);

class ScanInviteError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

async function readInvitePayload(req: NextRequest) {
  const contentType = req.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('multipart/form-data')) {
    const body = (await req.json()) as { payload?: unknown };
    if (typeof body.payload !== 'string') throw new ScanInviteError('QR payload is missing.', 400);
    return body.payload;
  }

  const form = await req.formData();
  const image = form.get('image');
  if (!image || typeof image === 'string') throw new ScanInviteError('Select a QR picture.', 400);
  if (image.size === 0) throw new ScanInviteError('The QR picture is empty.', 400);
  if (image.size > MAX_IMAGE_BYTES) throw new ScanInviteError('The QR picture must be smaller than 8 MB.', 413);
  if (!ALLOWED_IMAGE_TYPES.has(image.type.toLowerCase())) {
    throw new ScanInviteError('Upload a JPG, PNG, WebP, GIF, HEIC, or HEIF picture.', 415);
  }

  let payload: string | null;
  try {
    payload = await decodeQrImage(Buffer.from(await image.arrayBuffer()));
  } catch {
    throw new ScanInviteError('The picture could not be read. Try a clear JPG, PNG, or screenshot.', 422);
  }
  if (!payload) throw new ScanInviteError('No readable QR code was found in this picture.', 422);
  return payload;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ status: 'error', error: 'Login required' }, { status: 401 });

    const inviteCode = normalizeParentInvitePayload(await readInvitePayload(req));
    if (!inviteCode) throw new ScanInviteError('This is not a valid ilm AI parent QR code.', 422);

    const admin = await createAdminClient();
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profileError) throw profileError;
    if (profile?.role && profile.role !== 'student') {
      throw new ScanInviteError('A parent QR can only be connected from a student account.', 400);
    }

    const { data: invite, error: inviteError } = await (admin.from('parent_student_links') as any)
      .select('id, parent_id, invite_expires_at')
      .eq('invite_code', inviteCode)
      .eq('status', 'pending')
      .maybeSingle();
    if (inviteError) throw inviteError;
    if (!invite) throw new ScanInviteError('The invite code is invalid or has already been used.', 404);
    if (invite.parent_id === user.id) throw new ScanInviteError('You cannot use your own parent code.', 400);
    if (invite.invite_expires_at && new Date(invite.invite_expires_at).getTime() < Date.now()) {
      throw new ScanInviteError('The invite code has expired. Ask the parent to create a new QR code.', 410);
    }

    return NextResponse.json({
      status: 'success',
      data: {
        inviteCode,
        connectUrl: buildParentConnectPath(inviteCode),
      },
    });
  } catch (error) {
    if (error instanceof ScanInviteError) {
      return NextResponse.json({ status: 'error', error: error.message }, { status: error.status });
    }
    console.error('Parent QR scan error:', error);
    return NextResponse.json({ status: 'error', error: 'The QR picture could not be scanned.' }, { status: 500 });
  }
}
