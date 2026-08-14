import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { gatewayChat } from '@/lib/ai/gateway';
import { resolveAiRoutingProvider } from '@/lib/platform-settings/server';
import { parseAiJson } from '@/lib/utils/json-extract';

export const runtime = 'nodejs';

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const provider = await resolveAiRoutingProvider('studyTools');
  const result = await gatewayChat({
    provider,
    strictProvider: true,
    routingPolicy: 'text',
    tier: 'mini',
    messages: [
      { role: 'system', content: 'Suggest Pakistani student opportunities as draft database rows. Return JSON array only.' },
      { role: 'user', content: 'Suggest 5 scholarships, competitions, olympiads, hackathons, internships, research, admission, or government opportunities for grades 9-12. Keep is_verified false.' },
    ],
    maxTokens: 2000,
    temperature: 0.4,
  });
  const rows = parseAiJson<any[]>(result.text, []).map((row) => ({ ...row, is_verified: false, source: 'ai_curated' }));
  if (rows.length) await (createServiceClient() as any).from('opportunities').insert(rows);
  return NextResponse.json({ status: 'success', inserted: rows.length });
}
