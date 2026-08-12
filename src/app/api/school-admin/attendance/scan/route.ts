import { NextRequest, NextResponse } from 'next/server';
import { performOcr, validateOcrFile } from '@/lib/ocr';
import { gatewayChat, type AiProviderId } from '@/lib/ai/gateway';
import { getAdminAiProvider } from '@/lib/platform-settings/shared';
import { getPlatformSettings } from '@/lib/platform-settings/server';
import { checkDailyLimit } from '@/lib/rate-limit';
import { requireSchoolContext } from '@/lib/school-erp/access';

export const runtime = 'nodejs';
export const maxDuration = 60;

type ExtractedRow = { name: string; rollNumber: string | null; status: 'present' | 'absent' | 'late'; confidence: number };

function parseJsonArray(text: string): ExtractedRow[] {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try {
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (!match) return [];
    try {
      const parsed = JSON.parse(match[0]);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
}

function normalizeName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Handwritten attendance register scan (CLAUDE_CODE_MASTER_PROMPT.md Part 4.2). Reuses the app's
 * existing handwriting-capable OCR pipeline (performOcr, geminiOnly mode — same one
 * src/app/api/ocr/route.ts uses) rather than building a new one, then a follow-up gatewayChat pass
 * to turn the freeform OCR text into structured rows (mirrors src/lib/school-erp/ai-insights.ts's
 * report-card-remarks pattern: institutional AI billed to the school's plan via checkDailyLimit
 * abuse protection, NOT the teacher's personal FREE/PRO/ELITE OCR credits — see
 * SCHOOL_ERP_ACCESS_POLICY).
 */
export async function POST(req: NextRequest) {
  try {
    const { supabase, user, context } = await requireSchoolContext('attendance.manage', 'attendance');
    if (!user) return NextResponse.json({ status: 'error', error: 'Authentication is required' }, { status: 401 });
    if (!context) return NextResponse.json({ status: 'error', error: 'You cannot manage attendance here.' }, { status: 403 });

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const sectionId = String(formData.get('section_id') || '');
    if (!file) return NextResponse.json({ status: 'error', error: 'A register photo is required.' }, { status: 400 });
    if (!sectionId) return NextResponse.json({ status: 'error', error: 'A section is required.' }, { status: 400 });

    const validation = validateOcrFile(file.type, file.size);
    if (!validation.valid) return NextResponse.json({ status: 'error', error: validation.error }, { status: 400 });

    const limit = await checkDailyLimit(user.id, 'erp_mutation:ai-attendance-scan', 60);
    if (!limit.success) {
      return NextResponse.json({ status: 'error', error: 'Too many scans today. Try again tomorrow.' }, { status: 429 });
    }

    const client = supabase as any;

    const { data: sectionRow } = await client
      .from('school_sections')
      .select('id, organization_id')
      .eq('id', sectionId)
      .eq('organization_id', context.organization.id)
      .maybeSingle();
    if (!sectionRow) return NextResponse.json({ status: 'error', error: 'Section not found.' }, { status: 404 });

    const imageBuffer = Buffer.from(await file.arrayBuffer());
    const ocrResult = await performOcr({
      imageBuffer,
      mimeType: file.type,
      userTier: 'ELITE',
      mode: 'handwritten',
      geminiOnly: true,
      includeSummary: false,
      documentType: 'handwritten',
      language: 'en',
    });

    const settings = await getPlatformSettings();
    const provider = getAdminAiProvider(settings, 'grading') as AiProviderId;
    const extraction = await gatewayChat({
      provider,
      tier: 'mini',
      routingPolicy: 'gemini',
      temperature: 0.1,
      maxTokens: 2000,
      messages: [
        {
          role: 'system',
          content: `You read OCR text of a handwritten school attendance register and extract each student row.
Rules:
- Return ONLY a valid JSON array: [{"name":"...","rollNumber":"...","status":"present|absent|late","confidence":0.0-1.0}]
- rollNumber is null if none is visible for that row.
- status: infer present/absent/late from marks like P/A/L, ticks, crosses, or the word itself. Default to "present" only if there's a clear positive mark; otherwise use your best judgment and lower confidence.
- confidence reflects how legible/certain that specific row's name and mark are — lower it for smudged or ambiguous handwriting.
- Do not invent students not present in the text. Do not skip any row you can read.`,
        },
        { role: 'user', content: ocrResult.text },
      ],
    });
    const extractedRows = parseJsonArray(extraction.text);

    const { data: enrollments } = await client
      .from('school_enrollments')
      .select('student_id, roll_number, profiles!school_enrollments_student_id_fkey(full_name)')
      .eq('organization_id', context.organization.id)
      .eq('section_id', sectionId)
      .eq('status', 'active');

    const rows = extractedRows.map((row) => {
      const extractedRollNumber = row.rollNumber ? String(row.rollNumber).trim() : null;
      const extractedName = String(row.name || '').trim();
      const normalizedExtracted = normalizeName(extractedName);

      const byRoll = extractedRollNumber
        ? (enrollments || []).find((e: any) => e.roll_number && String(e.roll_number).trim() === extractedRollNumber)
        : null;
      const byName =
        !byRoll && normalizedExtracted
          ? (enrollments || []).find((e: any) => {
              const profile = Array.isArray(e.profiles) ? e.profiles[0] : e.profiles;
              return profile?.full_name && normalizeName(profile.full_name) === normalizedExtracted;
            })
          : null;
      const matched = byRoll || byName;
      const matchedProfile = matched ? (Array.isArray(matched.profiles) ? matched.profiles[0] : matched.profiles) : null;

      return {
        extractedName,
        extractedRollNumber,
        status: ['present', 'absent', 'late'].includes(row.status) ? row.status : 'present',
        confidence: typeof row.confidence === 'number' ? Math.max(0, Math.min(1, row.confidence)) : 0.5,
        matchedStudentId: matched?.student_id || null,
        matchedName: matchedProfile?.full_name || null,
        isNewStudent: !matched,
      };
    });

    return NextResponse.json({ status: 'success', data: { rows, ocrProvider: ocrResult.provider } });
  } catch (error) {
    return NextResponse.json(
      { status: 'error', error: error instanceof Error ? error.message : 'The register could not be scanned.' },
      { status: 500 }
    );
  }
}
