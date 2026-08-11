'use server';

// ============================================
// SCHOOL AI INSIGHTS
// The one thing a local ERP cannot copy. Report card remarks and the
// principal's monthly read-out both go through the existing AI gateway and
// the existing admin AI routing — no new provider, no new model config.
//
// Institutional AI does not touch a student's FREE/PRO/ELITE credits (see
// SCHOOL_ERP_ACCESS_POLICY); it is billed to the institution's own plan.
// ============================================

import { revalidatePath } from 'next/cache';
import { gatewayChat, type AiProviderId } from '@/lib/ai/gateway';
import { checkDailyLimit } from '@/lib/rate-limit';
import { getAdminAiProvider } from '@/lib/platform-settings/shared';
import { getPlatformSettings } from '@/lib/platform-settings/server';
import { createClient } from '@/lib/supabase/server';
import { getActiveSchoolOrganizationId, getSchoolContext, hasSchoolModule, hasSchoolPermission } from './access';
import type { SchoolActionState, SchoolPermission } from './types';
import type { SchoolModuleKey } from './modules';

// Enough students per request to be cheap, small enough that one bad response
// never wastes a whole exam's worth of tokens.
const REMARK_BATCH_SIZE = 25;

async function aiContext(permission: SchoolPermission, module: SchoolModuleKey, action: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be signed in.');
  const organizationId = await getActiveSchoolOrganizationId();
  const context =
    (organizationId ? await getSchoolContext(supabase, user.id, organizationId) : null) ||
    (await getSchoolContext(supabase, user.id));
  if (!context || !hasSchoolPermission(context, permission)) {
    throw new Error('You do not have permission for this action.');
  }
  if (!hasSchoolModule(context, module)) throw new Error('This module is not included in your institution plan.');
  const limit = await checkDailyLimit(user.id, `erp_mutation:ai-${action}`, 30);
  if (!limit.success) throw new Error('Daily AI limit for this tool has been reached. Try again tomorrow.');
  return { supabase, db: supabase as any, context };
}

async function resolveProvider(key: 'grading' | 'studyTools'): Promise<AiProviderId> {
  const settings = await getPlatformSettings();
  return getAdminAiProvider(settings, key) as AiProviderId;
}

function parseJsonPayload(text: string) {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // Models occasionally wrap the array in a sentence; take the outermost
    // bracketed span rather than failing the whole batch.
    const start = cleaned.search(/[[{]/);
    const end = Math.max(cleaned.lastIndexOf(']'), cleaned.lastIndexOf('}'));
    if (start === -1 || end <= start) return null;
    try {
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

/**
 * Writes an AI remark onto every report card of a published exam.
 * Stored in ai_comment, never in teacher_comment — a teacher's own words are
 * never overwritten by a model.
 */
export async function generateReportCardRemarks(
  _state: SchoolActionState,
  formData: FormData
): Promise<SchoolActionState> {
  try {
    const examId = String(formData.get('exam_id') || '').trim();
    if (!examId) throw new Error('Exam is required.');
    const { db, context } = await aiContext('exams.manage', 'exams', 'report-remarks');

    const { data: cards } = await db
      .from('school_report_cards')
      .select('id, student_id, summary, percentage, grade, class_position, profiles(full_name)')
      .eq('organization_id', context.organization.id)
      .eq('exam_id', examId)
      .not('published_at', 'is', null);
    if (!cards?.length) throw new Error('Publish the exam results before generating remarks.');

    const provider = await resolveProvider('grading');
    let written = 0;

    for (let start = 0; start < cards.length; start += REMARK_BATCH_SIZE) {
      const batch = cards.slice(start, start + REMARK_BATCH_SIZE);
      const payload = batch.map((card: any, index: number) => {
        const profile = Array.isArray(card.profiles) ? card.profiles[0] : card.profiles;
        return {
          i: index,
          name: profile?.full_name || 'Student',
          percentage: Number(card.percentage || 0),
          grade: card.grade || '',
          position: card.class_position || null,
          subjects: (card.summary?.subjects || []).map((subject: any) => ({
            subject: subject.subject,
            marks: subject.marks,
            max: subject.maxMarks,
            absent: Boolean(subject.absent),
          })),
        };
      });

      const result = await gatewayChat({
        provider,
        tier: 'mini',
        routingPolicy: 'text',
        temperature: 0.4,
        maxTokens: 220 * batch.length + 400,
        messages: [
          {
            role: 'system',
            content: `You write report card remarks for a Pakistani school. For each student write 2-3 sentences addressed to the parent: name the strongest subject, name the subject that needs work, and give one concrete, actionable suggestion.
Rules:
- Be encouraging and specific. Never shame a student.
- Never invent marks, ranks, or subjects that are not in the data.
- Plain text only, no Markdown, no emoji.
Return ONLY a valid JSON array: [{"i":0,"remark":"..."}]`,
          },
          { role: 'user', content: JSON.stringify(payload) },
        ],
      });

      const parsed = parseJsonPayload(result.text);
      if (!Array.isArray(parsed)) continue;
      const generatedAt = new Date().toISOString();
      for (const item of parsed) {
        const card = batch[Number(item?.i)];
        const remark = String(item?.remark || '').trim();
        if (!card || !remark) continue;
        const { error: updateError } = await db
          .from('school_report_cards')
          .update({ ai_comment: remark.slice(0, 1200), ai_comment_generated_at: generatedAt })
          .eq('id', card.id);
        // Do not count a remark the database refused (e.g. the migration that
        // adds ai_comment has not been applied yet).
        if (updateError) throw new Error(updateError.message);
        written += 1;
      }
    }

    if (!written) throw new Error('The AI service did not return usable remarks. Try again in a moment.');

    await db.from('school_audit_logs').insert({
      organization_id: context.organization.id,
      actor_user_id: context.userId,
      action: 'ai_generate',
      entity_type: 'report_card_remarks',
      entity_id: examId,
      metadata: { students: written, provider },
    });
    revalidatePath('/school-admin/exams');
    revalidatePath('/school');
    return { success: true, message: `AI remarks written for ${written} report cards.` };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Could not generate remarks.' };
  }
}

/**
 * A principal-facing read-out of the last 30 days: attendance, fee position,
 * and exam performance, turned into a short prioritized brief.
 */
export async function generatePrincipalSummary(
  _state: SchoolActionState,
  _formData: FormData
): Promise<SchoolActionState> {
  try {
    const { db, context } = await aiContext('reports.read', 'reports', 'principal-summary');
    const organizationId = context.organization.id;
    const since = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);

    const [attendance, invoices, reportCards, students] = await Promise.all([
      db
        .from('school_attendance_records')
        .select('status')
        .eq('organization_id', organizationId)
        .gte('attendance_date', since)
        .limit(5000),
      db
        .from('school_fee_invoices')
        .select('status, total_amount, paid_amount')
        .eq('organization_id', organizationId)
        .limit(2000),
      db
        .from('school_report_cards')
        .select('percentage, summary, school_exams(name)')
        .eq('organization_id', organizationId)
        .not('published_at', 'is', null)
        .order('generated_at', { ascending: false })
        .limit(500),
      db
        .from('school_enrollments')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('status', 'active'),
    ]);

    const attendanceRows = attendance.data || [];
    const presentCount = attendanceRows.filter((row: any) => row.status === 'present').length;
    const invoiceRows = invoices.data || [];
    const outstanding = invoiceRows.reduce(
      (sum: number, row: any) => sum + Math.max(0, Number(row.total_amount || 0) - Number(row.paid_amount || 0)),
      0
    );

    // Subject averages across the most recent published results, so the model
    // can name the weakest subject instead of guessing.
    const subjectTotals = new Map<string, { obtained: number; max: number }>();
    for (const card of reportCards.data || []) {
      for (const subject of card.summary?.subjects || []) {
        if (subject.absent || !subject.maxMarks) continue;
        const current = subjectTotals.get(subject.subject) || { obtained: 0, max: 0 };
        current.obtained += Number(subject.marks || 0);
        current.max += Number(subject.maxMarks || 0);
        subjectTotals.set(subject.subject, current);
      }
    }
    const subjects = Array.from(subjectTotals.entries())
      .map(([subject, value]) => ({
        subject,
        average: value.max ? Math.round((value.obtained / value.max) * 1000) / 10 : 0,
      }))
      .sort((left, right) => left.average - right.average)
      .slice(0, 12);

    const facts = {
      school: context.organization.name,
      activeStudents: Number(students.count || 0),
      periodDays: 30,
      attendanceMarked: attendanceRows.length,
      attendanceRate: attendanceRows.length ? Math.round((presentCount / attendanceRows.length) * 1000) / 10 : null,
      unpaidFeeTotal: Math.round(outstanding),
      currency: context.organization.currency,
      unpaidInvoices: invoiceRows.filter((row: any) => ['issued', 'partial', 'overdue'].includes(row.status)).length,
      resultsAnalyzed: (reportCards.data || []).length,
      subjectAverages: subjects,
    };

    const provider = await resolveProvider('studyTools');
    const result = await gatewayChat({
      provider,
      tier: 'mini',
      routingPolicy: 'text',
      temperature: 0.3,
      maxTokens: 900,
      messages: [
        {
          role: 'system',
          content: `You are an operations analyst briefing the principal of a Pakistani school. Using ONLY the JSON facts given, write a short Markdown brief with exactly these sections:
### What is working
### What needs attention
### Do this week
Rules:
- Cite the actual numbers you were given. Never invent a number, subject, or trend that is not in the data.
- If a field is null or zero, say the data is not being recorded rather than guessing.
- Three bullets maximum per section. Each "Do this week" bullet must be a concrete action.`,
        },
        { role: 'user', content: JSON.stringify(facts) },
      ],
    });

    const summary = result.text.trim();
    if (!summary) throw new Error('The AI service returned an empty summary.');

    await db.from('school_audit_logs').insert({
      organization_id: organizationId,
      actor_user_id: context.userId,
      action: 'ai_generate',
      entity_type: 'principal_summary',
      metadata: { provider, attendanceRate: facts.attendanceRate },
    });

    return { success: true, message: summary };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Could not generate the summary.' };
  }
}
