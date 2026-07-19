import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getResourceForProcessing } from '@/lib/resources/server';
import type { ProtectedResourceKind } from '@/lib/resources/server';

const KINDS = new Set<ProtectedResourceKind>(['library', 'past-paper', 'college-resource']);

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ status: 'error', error: 'Login required hai' }, { status: 401 });

  const kind = req.nextUrl.searchParams.get('kind') as ProtectedResourceKind;
  const id = req.nextUrl.searchParams.get('id');
  if (!KINDS.has(kind) || !id) return NextResponse.json({ status: 'error', error: 'Resource reference invalid hai' }, { status: 400 });

  const resource = await getResourceForProcessing(kind, id);
  if (!resource) return NextResponse.json({ status: 'error', error: 'Resource nahi mila' }, { status: 404 });
  const { data, error } = await (supabase
    .from('resource_mcq_sets' as any)
    .select('questions, status, generated_at')
    .eq('resource_kind', kind)
    .eq('resource_id', id)
    .maybeSingle() as any);
  if (error) return NextResponse.json({ status: 'error', error: 'MCQs load nahi huay' }, { status: 500 });
  if (!data || data.status !== 'ready') {
    return NextResponse.json({ status: 'processing', data: { questions: [], status: data?.status || 'queued' } }, { status: 202 });
  }
  return NextResponse.json({ status: 'success', data: { questions: data.questions || [], generatedAt: data.generated_at } });
}
