import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ status: 'anonymous_saved_locally' });

  const body = await req.json().catch(() => ({}));
  const studyEmails = body.studyEmails === true;

  const { error } = await (supabase.from('profiles') as any)
    .update({
      study_email_consent: studyEmails,
      study_email_unsubscribed_at: studyEmails ? null : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (error) return NextResponse.json({ error: 'The email preference could not be saved.' }, { status: 500 });
  return NextResponse.json({ status: 'success', studyEmails });
}
