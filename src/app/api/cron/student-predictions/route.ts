import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { computeStudentPredictions } from '@/lib/analytics/predict';
import { aiDecisionFeaturesEnabled } from '@/lib/compliance/ai-decision-features';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!aiDecisionFeaturesEnabled()) {
    return NextResponse.json({ status: 'disabled', processed: 0 });
  }

  try {
    const supabase = createServiceClient() as any;
    const { data: profiles, error } = await supabase.from('profiles').select('id').eq('role', 'student').limit(500);
    if (error) throw error;

    let processed = 0;
    for (const profile of profiles || []) {
      await computeStudentPredictions(profile.id);
      processed += 1;
    }

    return NextResponse.json({ status: 'success', processed });
  } catch (error) {
    console.error('Student predictions cron error:', error);
    return NextResponse.json({ status: 'error', error: 'Prediction cron failed' }, { status: 500 });
  }
}
