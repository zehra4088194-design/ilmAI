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
 * Resolves which AiProviderId a gatewayChat({ strictProvider: true, ... }) call should use for a
 * given admin-configurable routing key, in one place — every AI feature should call this instead
 * of hardcoding a provider, so the /admin provider dropdowns actually control what runs.
 * 'local' isn't a real inference target for most routes (it needs a self-hosted model reachable
 * from the gateway), so it maps to 'groq' as the practical low-cost equivalent, matching the
 * convention already used by chat/resource-test/resource-summary/student-chat routes.
 */
export async function resolveAiRoutingProvider(key: AiRoutingKey): Promise<AiProviderId> {
  const settings = await getPlatformSettings();
  const adminProvider = getAdminAiProvider(settings, key);
  return adminProvider === 'local' ? 'groq' : adminProvider;
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
