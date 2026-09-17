import { createServiceClient } from '@/lib/supabase/service';
import type { AiProviderId } from '@/lib/ai/gateway';
import {
  DEFAULT_PLATFORM_SETTINGS,
  SUBSCRIPTION_SETTINGS_KEY,
  getAdminAiProvider,
  normalizePlatformSettings,
  type AiRoutingKey,
  type PlatformSettings,
} from './shared';

let warnedAboutSettings = false;

export async function getPlatformSettings(): Promise<PlatformSettings> {
  try {
    const supabase = createServiceClient() as any;
    const { data, error } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', SUBSCRIPTION_SETTINGS_KEY)
      .maybeSingle();

    if (error) throw error;
    return normalizePlatformSettings(data?.value);
  } catch (error) {
    if (!warnedAboutSettings) {
      warnedAboutSettings = true;
      console.warn('Platform settings fallback active:', error);
    }
    return DEFAULT_PLATFORM_SETTINGS;
  }
}

/**
 * Resolve the exact provider selected by the admin for a routing key.
 * Never substitute a different provider here: if the selected provider is
 * unavailable, the calling AI feature must surface an error rather than switch
 * providers silently.
 */
export async function resolveAiRoutingProvider(key: AiRoutingKey): Promise<AiProviderId> {
  const settings = await getPlatformSettings();
  return getAdminAiProvider(settings, key) as AiProviderId;
}

export async function savePlatformSettings(settings: PlatformSettings, updatedBy?: string) {
  const supabase = createServiceClient() as any;
  const normalized = normalizePlatformSettings(settings);
  const { data, error } = await supabase
    .from('platform_settings')
    .upsert(
      {
        key: SUBSCRIPTION_SETTINGS_KEY,
        value: normalized,
        updated_by: updatedBy || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    )
    .select('value')
    .single();

  if (error) throw error;
  return normalizePlatformSettings(data?.value);
}