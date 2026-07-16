import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { gatewayChat } from '@/lib/ai/gateway';
import { checkUniversityFeatureLimit, getUniversityLimitExceededMessage } from '@/lib/rate-limit';
import { parseAiJson } from '@/lib/utils/json-extract';
import type { SubscriptionTier } from '@/types';

export const runtime = 'nodejs';
export const maxDuration = 90;

const TOOL_LABEL = 'PharmaPulse Drug Intelligence';

function cleanString(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, 700) : fallback;
}

function buildDrugPrompt(query: string, mode: string) {
  const modeInstr =
    mode === 'patient'
      ? 'Use simple patient-friendly English with light Roman Urdu where useful. Avoid heavy jargon and explain terms.'
      : 'Use proper clinical and pharmacological terminology suitable for medical, pharmacy, nursing and allied-health students.';

  return `You are an expert clinical pharmacologist specializing in medicines used in Pakistan.

${modeInstr}

The user searched for: "${query}"

Return ONLY a valid JSON object. No markdown, no backticks.

{
  "medicine_name": "official generic name",
  "aliases": ["brand names", "salt names", "common spellings"],
  "drug_class": "pharmacological class",
  "overview": {
    "summary": "2-3 sentence overview",
    "key_points": ["point1", "point2", "point3", "point4"]
  },
  "therapeutic_uses": ["use1", "use2", "use3", "use4", "use5"],
  "adverse_reactions": {
    "common": ["effect1", "effect2", "effect3"],
    "serious": ["effect1", "effect2"],
    "seek_medical_help_when": ["situation1", "situation2"]
  },
  "contraindications": {
    "absolute": ["contraindication1", "contraindication2"],
    "cautions": ["caution1", "caution2", "caution3"]
  },
  "mechanism_of_action": "clear explanation",
  "pharmacokinetics_pharmacodynamics": {
    "absorption": "details",
    "distribution": "details",
    "metabolism": "details",
    "elimination": "details",
    "half_life": "X hours",
    "pharmacodynamics_notes": "notes"
  },
  "adult_dosing": ["Indication: dose regimen"],
  "pediatric_dosing": ["Age/weight: dose regimen"],
  "drug_interactions": {
    "major": ["Drug X: effect description"],
    "moderate": ["Drug A: effect description"],
    "administration_notes": ["note1", "note2"]
  },
  "pregnancy_lactation": {
    "pregnancy": "risk summary and practical note",
    "lactation": "risk summary and practical note"
  },
  "renal_hepatic_considerations": {
    "renal": "dose adjustment notes",
    "hepatic": "hepatic caution notes"
  },
  "monitoring_parameters": ["param1", "param2", "param3"],
  "counseling_points": ["point1", "point2", "point3", "point4", "point5"],
  "pakistan_brand_names": [
    {"brand":"BrandName","strengths":["250mg","500mg"],"company":"CompanyName","dosage_forms":["tablet","capsule"]}
  ],
  "related_clinical_case": {
    "scenario": "brief realistic clinical case from Pakistan context",
    "discussion": "why this drug was chosen",
    "pearls": ["pearl1", "pearl2", "pearl3"]
  },
  "faq": [
    {"question":"Can it be taken on empty stomach?","answer":"detailed answer"},
    {"question":"Is it safe in pregnancy?","answer":"detailed answer"},
    {"question":"Can it cause drowsiness?","answer":"detailed answer"},
    {"question":"What to do if a dose is missed?","answer":"detailed answer"},
    {"question":"How long to take this medicine?","answer":"detailed answer"},
    {"question":"Can it be taken with food?","answer":"detailed answer"}
  ],
  "references": [
    "British National Formulary (BNF), current edition",
    "Martindale: The Complete Drug Reference",
    "FDA Drug Label / Package Insert",
    "WHO Model Formulary",
    "Pakistan National Formulary"
  ],
  "safety_disclaimer": "This information is for educational purposes only and should be verified by a licensed clinician before prescribing or dispensing."
}

For pakistan_brand_names, include 5-8 realistic brands commonly available in Pakistan where appropriate. Use companies such as Getz Pharma, AGP, Hilton Pharma, Abbott Pakistan, Pfizer Pakistan, Sanofi, Novartis Pakistan, GSK Pakistan, Adamjee Pharma, Ferozsons, Highnoon Labs, Searle Pakistan, and Martin Dow when plausible.
Do not invent exact current availability. If uncertain, say availability should be verified locally.
Return ONLY the JSON object, starting with { and ending with }.`;
}

function buildMcqPrompt(drugName: string) {
  return `You are a pharmacology MCQ writer for Pakistani medical and pharmacy students.
Generate 6 high-quality multiple-choice questions about "${drugName}".
Cover mechanism of action, dosing principles, drug interactions, adverse effects, contraindications, counseling, and clinical use.

Return ONLY a valid JSON array. No markdown, no backticks:
[
  {
    "question": "question text",
    "options": {"A":"option A","B":"option B","C":"option C","D":"option D"},
    "correct": "A",
    "explanation": "why the answer is correct"
  }
]`;
}

function buildSuggestionsPrompt(query: string) {
  return `You are a pharmaceutical database assistant. Based on the user's search "${query}", suggest up to 6 common pharmaceutical drugs that match or are similar.

Return ONLY a valid JSON array. No markdown, no explanation:
[{"name":"Drug Name","cls":"Drug Class"}]

Rules:
- Only suggest real pharmaceutical drugs or official generic names.
- Match by generic name, common brand spelling, salt name, or drug class.
- Prefer medicines commonly taught or used in Pakistan when relevant.
- Put the therapeutic/pharmacological class in "cls".
- Sort by relevance.`;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ status: 'error', error: 'Login required' }, { status: 401 });

    const body = await req.json();
    const action = cleanString(body.action, 'drug');
    const query = cleanString(body.query);
    const mode = cleanString(body.mode, 'student');
    if (!query) return NextResponse.json({ status: 'error', error: 'Medicine name required hai' }, { status: 400 });

    if (action === 'suggestions') {
      const result = await gatewayChat({
        provider: 'groq',
        tier: 'mini',
        messages: [
          {
            role: 'system',
            content: 'Return only valid JSON. You suggest real medicines for a pharmacology search box.',
          },
          { role: 'user', content: buildSuggestionsPrompt(query) },
        ],
        maxTokens: 500,
        temperature: 0.25,
      });
      const suggestions = parseAiJson<{ name?: string; cls?: string }[]>(result.text, [])
        .filter((item) => item?.name)
        .slice(0, 6)
        .map((item) => ({ name: cleanString(item.name), cls: cleanString(item.cls, 'Medicine') }));
      return NextResponse.json({ status: 'success', data: { action, result: suggestions } });
    }

    const { data: profile } = await supabase.from('profiles').select('subscription_tier').eq('id', user.id).single();
    const tier = (profile?.subscription_tier as SubscriptionTier) || 'FREE';
    const limitCheck = await checkUniversityFeatureLimit(
      user.id,
      tier,
      action === 'mcq' ? 'pharmapulse_mcq' : 'pharmapulse_drug'
    );
    if (!limitCheck.success) {
      return NextResponse.json(
        {
          status: 'error',
          error: await getUniversityLimitExceededMessage(tier, limitCheck.scope, TOOL_LABEL),
        },
        { status: 429 }
      );
    }

    const result = await gatewayChat({
      provider: 'gemini',
      tier: 'pro',
      messages: [
        {
          role: 'system',
          content:
            'You are PharmaPulse, a clinical pharmacology study assistant. Return only valid JSON. Include strong safety caveats. Never replace clinician judgment.',
        },
        { role: 'user', content: action === 'mcq' ? buildMcqPrompt(query) : buildDrugPrompt(query, mode) },
      ],
      maxTokens: action === 'mcq' ? 3000 : 7000,
      temperature: 0.25,
    });

    const parsed =
      action === 'mcq'
        ? parseAiJson<unknown[]>(result.text, [])
        : parseAiJson<Record<string, unknown>>(result.text, {});

    if (Array.isArray(parsed) ? parsed.length === 0 : !Object.keys(parsed).length) {
      return NextResponse.json(
        { status: 'error', error: 'PharmaPulse response parse nahi ho saka. Dobara try karo.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ status: 'success', data: { action, result: parsed } });
  } catch (error) {
    console.error('PharmaPulse route error:', error);
    return NextResponse.json({ status: 'error', error: 'PharmaPulse response generate nahi ho saka' }, { status: 500 });
  }
}
