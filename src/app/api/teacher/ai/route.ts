import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { gatewayChat } from '@/lib/ai/gateway';
import { resolveAiRoutingProvider } from '@/lib/platform-settings/server';
import { isTeacherAuthorized } from '@/lib/teacher/authorization';

const OPS = new Set(['quiz','assignment','worksheet','weak_topics','report_comment']);
const LABELS: Record<string,string> = { quiz:'Quiz', assignment:'Assignment', worksheet:'Worksheet', weak_topics:'Weak-topic analysis', report_comment:'Report-card comment' };

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Login required.' }, { status: 401 });
    if (!(await isTeacherAuthorized(supabase, user.id))) return NextResponse.json({ error: 'Teacher access is required.' }, { status: 403 });
    const body = await req.json();
    const operation = String(body.operation || 'quiz');
    if (!OPS.has(operation)) return NextResponse.json({ error: 'Unknown teacher AI tool.' }, { status: 400 });
    const input = String(body.input || '').trim().slice(0, 12000);
    if (!input) return NextResponse.json({ error: 'Add some topic or class information first.' }, { status: 400 });
    const provider = await resolveAiRoutingProvider(operation === 'report_comment' ? 'grading' : 'studyTools');
    const instruction = operation === 'quiz'
      ? 'Create a ready-to-use classroom quiz with 10 varied questions, answer key, marks and concise explanations.'
      : operation === 'assignment'
        ? 'Create a clear classroom assignment with learning objectives, student instructions, 5 tasks, marking rubric and submission requirements.'
        : operation === 'worksheet'
          ? 'Create a printable worksheet with a mix of recall, application and challenge questions, plus a separate answer key.'
          : operation === 'weak_topics'
            ? 'Analyze the supplied class performance data. Identify the weakest topics, likely causes supported by the data, and a practical 7-day remediation plan.'
            : 'Write 3 professional report-card comments based only on the supplied evidence: supportive, concise, specific, and non-inflated.';
    const result = await gatewayChat({
      provider,
      strictProvider: true,
      routingPolicy: 'text',
      tier: 'mini',
      maxTokens: 3000,
      temperature: 0.25,
      messages: [
        { role: 'system', content: `You are ilm AI's ${LABELS[operation]} assistant for teachers. ${instruction} Never invent student facts, scores or curriculum details not in the input.` },
        { role: 'user', content: input },
      ],
    });
    return NextResponse.json({ result: result.text, operation });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Teacher AI failed.' }, { status: 500 });
  }
}
