import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { gatewayChat, type AiProviderId } from '@/lib/ai/gateway';
import { checkAiMessageLimit, consumeAiCredits } from '@/lib/rate-limit';
import { parseAiJson } from '@/lib/utils/json-extract';
import type { SubscriptionTier } from '@/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

type WrittenQuestion = {
  id: string;
  q: string;
  section?: 'short' | 'long';
  marks?: number;
  keyPoints?: string[];
  guide?: string;
};

type WrittenEvaluation = {
  id?: string;
  score: number;
  grade: string;
  feedback: string;
  provider?: AiProviderId | string;
};

type McqReviewInput = {
  q: string;
  opts?: string[];
  correct: number;
  userAns?: number;
};

type McqExplanation = {
  index: number;
  explanation: string;
};

function clampScore(value: unknown, maxMarks: number) {
  return Math.max(0, Math.min(Number(value) || 0, maxMarks));
}

function gradeShortAnswerInternally(question: WrittenQuestion, answer: string): WrittenEvaluation {
  const keyPoints = (question.keyPoints || []).map((point) => point.toLowerCase().trim()).filter(Boolean);
  const normalized = answer.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
  const maxMarks = Number(question.marks) || 0;

  if (!normalized) {
    return {
      id: question.id,
      score: 0,
      grade: 'F',
      feedback: '### Not attempted\n- No written answer was provided.',
      provider: 'local',
    };
  }

  const matched = keyPoints.filter((point) => {
    const words = point.split(/\s+/).filter((word) => word.length > 3);
    if (normalized.includes(point)) return true;
    if (!words.length) return false;
    const hits = words.filter((word) => normalized.includes(word)).length;
    return hits / words.length >= 0.6;
  });
  const coverage = keyPoints.length ? matched.length / keyPoints.length : Math.min(1, normalized.split(/\s+/).length / 30);
  const score = clampScore(maxMarks * coverage, maxMarks);
  const missing = keyPoints.filter((point) => !matched.includes(point)).slice(0, 2);

  return {
    id: question.id,
    score,
    grade: score >= maxMarks * 0.75 ? 'Good' : score >= maxMarks * 0.45 ? 'Partial' : 'Needs work',
    feedback: `### ${score >= maxMarks * 0.75 ? 'Concept mostly correct' : 'Partial concept match'}\n- Matched ${matched.length}/${Math.max(1, keyPoints.length)} key point(s).\n${missing.length ? `- Missing: **${missing.join('; ')}**.` : '- Main required concept is covered.'}`,
    provider: 'local',
  };
}

async function gradeWrittenBatch({
  questions,
  answers,
  subjectName,
  className,
  provider,
}: {
  questions: WrittenQuestion[];
  answers: Record<string, string>;
  subjectName: string;
  className: string;
  provider: AiProviderId;
}) {
  if (!questions.length) return [] as WrittenEvaluation[];

  const payload = questions.map((question, index) => ({
    index,
    id: question.id,
    section: question.section || 'short',
    question: question.q,
    keyPoints: question.keyPoints || [],
    guide: question.guide || '',
    marks: Number(question.marks) || 0,
    studentAnswer: answers[question.id] || '',
  }));

  const result = await gatewayChat({
    provider,
    tier: 'mini',
    strictProvider: true,
    routingPolicy: provider === 'local' ? 'local' : 'grading',
    maxTokens: Math.min(5000, Math.max(1200, questions.length * 650)),
    temperature: 0.15,
    messages: [
      {
        role: 'system',
        content: `You are a Pakistani board exam evaluator. Grade conceptually, not by exact wording.
Return ONLY a valid JSON array. Each item must be:
{"id":"question id","score":number,"grade":"short label","feedback":"short Markdown feedback"}
Clamp every score between 0 and that question's marks. Award partial marks when the student's concept is correct but wording differs. Penalize unrelated, missing, or contradictory answers.`,
      },
      {
        role: 'user',
        content: JSON.stringify({ className, subjectName, questions: payload }),
      },
    ],
  });

  const parsed = parseAiJson<Array<Partial<WrittenEvaluation>>>(result.text, []);
  if (!Array.isArray(parsed) || parsed.length !== questions.length) {
    throw new Error(`${provider} returned invalid written grading response.`);
  }

  return questions.map((question, index) => {
    const item = parsed.find((entry) => entry.id === question.id) || parsed[index] || {};
    const maxMarks = Number(question.marks) || 0;
    return {
      id: question.id,
      score: clampScore(item.score, maxMarks),
      grade: String(item.grade || '?'),
      feedback: typeof item.feedback === 'string' ? item.feedback : '### Checked\n- Feedback was not available.',
      provider: result.providerUsed || provider,
    };
  });
}

async function explainMcqsWithDeepSeek({
  mcqs,
  subjectName,
  className,
}: {
  mcqs: McqReviewInput[];
  subjectName: string;
  className: string;
}) {
  if (!mcqs.length) return [] as McqExplanation[];

  const result = await gatewayChat({
    provider: 'deepseek',
    tier: 'mini',
    strictProvider: true,
    routingPolicy: 'grading',
    maxTokens: Math.min(3500, Math.max(700, mcqs.length * 180)),
    temperature: 0.2,
    messages: [
      {
        role: 'system',
        content:
          'Explain MCQ results for Pakistani board students. Return ONLY valid JSON array: [{"index":0,"explanation":"one short explanation"}]. Explain why the chosen answer is correct or wrong and mention the correct concept.',
      },
      {
        role: 'user',
        content: JSON.stringify({
          className,
          subjectName,
          mcqs: mcqs.map((mcq, index) => ({
            index,
            question: mcq.q,
            options: mcq.opts || [],
            selectedOptionIndex: mcq.userAns,
            correctOptionIndex: mcq.correct,
          })),
        }),
      },
    ],
  });

  const parsed = parseAiJson<McqExplanation[]>(result.text, []);
  return Array.isArray(parsed)
    ? parsed
        .map((item) => ({
          index: Number(item.index),
          explanation: String(item.explanation || '').trim(),
        }))
        .filter((item) => Number.isInteger(item.index) && item.explanation)
    : [];
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ status: 'error', error: 'Login required' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('subscription_tier').eq('id', user.id).single();
    const tier = (profile?.subscription_tier as SubscriptionTier) || 'FREE';
    const limitCheck = await checkAiMessageLimit(user.id, tier, 'grade_test');
    if (!limitCheck.success)
      return NextResponse.json({ status: 'error', error: 'The daily AI limit has been reached.' }, { status: 429 });

    const { questions = [], answers = {}, mcqs = [], subjectName = 'Subject', className = 'Class' } = await req.json();
    const writtenQuestions = (Array.isArray(questions) ? questions : []) as WrittenQuestion[];
    const shortQuestions = writtenQuestions.filter((question) => question.section !== 'long');
    const longQuestions = writtenQuestions.filter((question) => question.section === 'long');

    const [mcqExplanations, shortEvals, longEvals] = await Promise.all([
      explainMcqsWithDeepSeek({ mcqs: Array.isArray(mcqs) ? mcqs : [], subjectName, className }).catch(() => []),
      gradeWrittenBatch({
        questions: shortQuestions,
        answers,
        subjectName,
        className,
        provider: 'local',
      }).catch(() => shortQuestions.map((question) => gradeShortAnswerInternally(question, answers[question.id] || ''))),
      gradeWrittenBatch({
        questions: longQuestions,
        answers,
        subjectName,
        className,
        provider: 'groq',
      }),
    ]);

    const byId = new Map([...shortEvals, ...longEvals].map((item) => [item.id, item]));
    const evals = writtenQuestions.map((question) => byId.get(question.id) || {
      id: question.id,
      score: 0,
      grade: '?',
      feedback: '### Not checked\n- This answer could not be graded.',
    });

    await consumeAiCredits(user.id, tier, 'grade_test');
    return NextResponse.json({ status: 'success', data: { written: evals, mcqExplanations } });
  } catch (error) {
    console.error('Grade test error:', error);
    return NextResponse.json({ status: 'error', error: 'Grading failed' }, { status: 500 });
  }
}
