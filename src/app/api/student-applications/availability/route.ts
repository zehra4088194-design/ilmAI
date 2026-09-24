import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getStudentApplicationContext } from '@/lib/student-applications/server';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ connected: false }, { status: 401 });

  const institutions = await getStudentApplicationContext(user.id);
  return NextResponse.json({ connected: institutions.length > 0 });
}
