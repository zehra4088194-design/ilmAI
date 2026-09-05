import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { COMPETITION_TYPE_LABEL } from '@/lib/competitions/types';
import { generateCompetitionCertificatePdf } from '@/lib/competitions/certificate';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ status: 'error', error: 'Login required.' }, { status: 401 });
  const db = supabase as any;

  const [{ data: competition }, { data: entry }, { data: profile }] = await Promise.all([
    db.from('competitions').select('title, competition_type, ends_at').eq('id', id).maybeSingle(),
    db.from('competition_entries').select('rank, percentile, score, completed_at').eq('competition_id', id).eq('user_id', user.id).maybeSingle(),
    db.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
  ]);
  if (!competition) return NextResponse.json({ status: 'error', error: 'Competition not found.' }, { status: 404 });
  if (!entry?.completed_at) return NextResponse.json({ status: 'error', error: 'Complete the competition to earn a certificate.' }, { status: 409 });

  const { count } = await db.from('competition_entries').select('id', { count: 'exact', head: true }).eq('competition_id', id).not('completed_at', 'is', null);

  const pdf = await generateCompetitionCertificatePdf({
    studentName: profile?.full_name || 'Student',
    competitionTitle: competition.title,
    competitionTypeLabel: COMPETITION_TYPE_LABEL[competition.competition_type as keyof typeof COMPETITION_TYPE_LABEL] || 'Competition',
    rank: entry.rank || 1,
    percentile: entry.percentile,
    totalParticipants: count || 1,
    score: entry.score,
    dateLabel: new Date(competition.ends_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
  });

  return new NextResponse(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="ilm-ai-certificate-${id.slice(0, 8)}.pdf"`,
    },
  });
}
