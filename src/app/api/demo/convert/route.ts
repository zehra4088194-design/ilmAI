import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

export const runtime = 'nodejs';

const DEMO_COOKIE = 'ilm_ai_demo_session';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(DEMO_COOKIE)?.value;
    if (!token) return NextResponse.json({ status: 'ignored' });

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ status: 'ignored' }, { status: 401 });

    const service = createServiceClient() as any;
    await service
      .from('demo_attempts')
      .update({ converted_to_user_id: user.id })
      .eq('session_token', token)
      .not('completed_at', 'is', null)
      .is('converted_to_user_id', null);

    return NextResponse.json({ status: 'success' });
  } catch (error) {
    console.error('demo convert error:', error);
    return NextResponse.json({ status: 'ignored' });
  }
}
