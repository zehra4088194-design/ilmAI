import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const db = supabase as any;
  const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).maybeSingle();

  if (profile?.role === 'parent') {
    const { data: links } = await db
      .from('parent_student_links')
      .select('student_id')
      .eq('parent_id', user.id)
      .eq('status', 'approved');
    const studentIds = (links || []).map((row: any) => row.student_id).filter(Boolean);
    if (!studentIds.length) return NextResponse.json({ people: [] });

    const { data: children, error } = await db
      .from('profiles')
      .select('id, full_name, avatar_url, role')
      .in('id', studentIds)
      .order('full_name', { ascending: true });
    if (error) return NextResponse.json({ error: 'People could not be loaded.' }, { status: 500 });

    return NextResponse.json({
      people: (children || []).map((person: any) => ({
        id: person.id,
        name: person.full_name || 'Linked student',
        avatar_url: person.avatar_url || null,
        role: person.role || 'student',
      })),
    });
  }

  const { data: people, error } = await db
    .from('profiles')
    .select('id, full_name, avatar_url, role')
    .neq('id', user.id)
    .order('full_name', { ascending: true })
    .limit(300);
  if (error) return NextResponse.json({ error: 'People could not be loaded.' }, { status: 500 });

  return NextResponse.json({
    people: (people || []).map((person: any) => ({
      id: person.id,
      name: person.full_name || 'ilm AI user',
      avatar_url: person.avatar_url || null,
      role: person.role || 'student',
    })),
  });
}
