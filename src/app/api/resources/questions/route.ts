import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { getResourceForProcessing } from '@/lib/resources/server';
import type { ProtectedResourceKind } from '@/lib/resources/server';
import { filterHighQualitySourceMcqs, shuffleSourceQuestions } from '@/lib/resources/source-fallback';
import { queueResourceContextProcessing } from '@/lib/resources/processing';
import { selectEffectiveSubscription } from '@/lib/payments/subscription-access';

const KINDS = new Set<ProtectedResourceKind>(['library', 'past-paper', 'college-resource', 'university-resource']);

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ status: 'error', error: 'Authentication is required' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier, subscription_expires_at')
    .eq('id', user.id)
    .maybeSingle();

  const { data: subscriptionRows } = await (supabase.from('subscriptions') as any)
    .select('tier, status, current_period_end')
    .eq('user_id', user.id)
    .in('status', ['active', 'trialing', 'past_due'])
    .gt('current_period_end', new Date().toISOString())
    .limit(10);

  const effective = selectEffectiveSubscription([
    ...((subscriptionRows || []) as any[]),
    {
      tier: profile?.subscription_tier || 'FREE',
      status:
        profile?.subscription_tier && profile.subscription_tier !== 'FREE' ? 'active' : 'canceled',
      current_period_end:
        profile?.subscription_tier && profile.subscription_tier !== 'FREE'
          ? profile.subscription_expires_at || '2099-12-31T23:59:59.000Z'
          : null,
    },
  ]);

  if (effective.tier === 'FREE') {
    return NextResponse.json(
      { status: 'error', error: 'Chapter MCQs are available on PRO and ELITE plans.' },
      { status: 403 }
    );
  }

  const kind = req.nextUrl.searchParams.get('kind') as ProtectedResourceKind;
  const id = req.nextUrl.searchParams.get('id');
  if (!KINDS.has(kind) || !id)
    return NextResponse.json({ status: 'error', error: 'The resource reference is invalid' }, { status: 400 });

  const resource = await getResourceForProcessing(kind, id);
  if (!resource) return NextResponse.json({ status: 'error', error: 'The resource was not found.' }, { status: 404 });
  // resource_mcq_sets now lives in the standalone question-bank project (service-role
  // only) — the plain session client used above (for auth) has no access there.
  const questionBank = createServiceClient();
  const { data, error } = await (questionBank
    .from('resource_mcq_sets' as any)
    .select('questions, short_questions, long_questions, status, generated_at')
    .eq('resource_kind', kind)
    .eq('resource_id', id)
    .maybeSingle() as any);
  if (error) return NextResponse.json({ status: 'error', error: 'MCQs could not be loaded.' }, { status: 500 });
  if (!data || data.status !== 'ready') {
    return NextResponse.json(
      { status: 'processing', data: { questions: [], status: data?.status || 'queued' } },
      { status: 202 }
    );
  }
  const questions = shuffleSourceQuestions(filterHighQualitySourceMcqs(data.questions)).slice(0, 30);
  const hasWrittenQuestions =
    (Array.isArray(data.short_questions) && data.short_questions.length > 0) ||
    (Array.isArray(data.long_questions) && data.long_questions.length > 0);
  if (!questions.length && !hasWrittenQuestions && Array.isArray(data.questions) && data.questions.length > 0) {
    await queueResourceContextProcessing(kind, id);
    return NextResponse.json({ status: 'processing', data: { questions: [], status: 'queued' } }, { status: 202 });
  }
  return NextResponse.json({ status: 'success', data: { questions, generatedAt: data.generated_at } });
}
