import { createServiceClient } from '@/lib/supabase/service';

export type AiKeyMode = 'rotation' | 'fixed';
export type AiKeyProvider = 'groq' | 'gemini' | 'openrouter';
export type AiKeySelection = {
  mode: AiKeyMode;
  keyNumber: number;
};
export type WhatsAppAiSettings = {
  provider: 'groq' | 'gemini' | 'openrouter';
  tier: 'mini' | 'medium' | 'pro';
};
export type AiRuntimeSettings = {
  groq: AiKeySelection;
  gemini: AiKeySelection;
  openrouter: AiKeySelection;
  whatsapp: WhatsAppAiSettings;
};

const SETTINGS_KEY = 'ai_runtime_settings';

export const DEFAULT_AI_RUNTIME_SETTINGS: AiRuntimeSettings = {
  groq: { mode: 'rotation', keyNumber: 1 },
  gemini: { mode: 'rotation', keyNumber: 1 },
  openrouter: { mode: 'rotation', keyNumber: 1 },
  whatsapp: { provider: 'openrouter', tier: 'mini' },
};

function normalizeSelection(value: unknown, fallback: AiKeySelection): AiKeySelection {
  const source = value && typeof value === 'object' ? (value as Partial<AiKeySelection>) : {};
  const mode = source.mode === 'fixed' ? 'fixed' : 'rotation';
  const rawKey = Number(source.keyNumber);
  return {
    mode,
    keyNumber: Number.isInteger(rawKey) && rawKey >= 1 && rawKey <= 10 ? rawKey : fallback.keyNumber,
  };
}

function normalizeWhatsApp(value: unknown): WhatsAppAiSettings {
  const source = value && typeof value === 'object' ? (value as Partial<WhatsAppAiSettings>) : {};
  return {
    provider:
      source.provider === 'groq' || source.provider === 'gemini' || source.provider === 'openrouter'
        ? source.provider
        : DEFAULT_AI_RUNTIME_SETTINGS.whatsapp.provider,
    tier:
      source.tier === 'medium' || source.tier === 'pro' ? source.tier : 'mini',
  };
}

export function normalizeAiRuntimeSettings(input: unknown): AiRuntimeSettings {
  const source = input && typeof input === 'object' ? (input as Partial<AiRuntimeSettings>) : {};
  return {
    groq: normalizeSelection(source.groq, DEFAULT_AI_RUNTIME_SETTINGS.groq),
    gemini: normalizeSelection(source.gemini, DEFAULT_AI_RUNTIME_SETTINGS.gemini),
    openrouter: normalizeSelection(source.openrouter, DEFAULT_AI_RUNTIME_SETTINGS.openrouter),
    whatsapp: normalizeWhatsApp(source.whatsapp),
  };
}

export async function getAiRuntimeSettings(): Promise<AiRuntimeSettings> {
  try {
    const supabase = createServiceClient() as any;
    const { data, error } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', SETTINGS_KEY)
      .maybeSingle();
    if (error) throw error;
    return normalizeAiRuntimeSettings(data?.value);
  } catch (error) {
    console.warn('AI runtime settings fallback active:', error);
    return DEFAULT_AI_RUNTIME_SETTINGS;
  }
}

export async function saveAiRuntimeSettings(settings: AiRuntimeSettings, updatedBy?: string) {
  const normalized = normalizeAiRuntimeSettings(settings);
  const supabase = createServiceClient() as any;
  const { data, error } = await supabase
    .from('platform_settings')
    .upsert(
      {
        key: SETTINGS_KEY,
        value: normalized,
        updated_by: updatedBy || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    )
    .select('value')
    .single();
  if (error) throw error;
  return normalizeAiRuntimeSettings(data?.value);
}
