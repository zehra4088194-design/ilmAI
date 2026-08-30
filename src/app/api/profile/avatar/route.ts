import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { tryDeletePreviousAvatar, uploadUserAvatar } from '@/lib/profile/avatar-storage';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ status: 'error', error: 'Authentication is required.' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ status: 'error', error: 'No file provided.' }, { status: 400 });
  }
  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ status: 'error', error: 'Only image files are allowed.' }, { status: 400 });
  }

  const { data: profile } = await supabase.from('profiles').select('avatar_url').eq('id', user.id).single();

  let avatarUrl: string;
  try {
    avatarUrl = await uploadUserAvatar(supabase, user.id, file);
  } catch (error) {
    return NextResponse.json(
      { status: 'error', error: error instanceof Error ? error.message : 'Upload failed.' },
      { status: 400 }
    );
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
    .eq('id', user.id);
  if (updateError) {
    return NextResponse.json({ status: 'error', error: updateError.message }, { status: 400 });
  }

  await tryDeletePreviousAvatar(supabase, profile?.avatar_url);

  return NextResponse.json({ status: 'success', data: { avatarUrl } });
}
