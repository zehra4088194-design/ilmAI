import { createServiceClient } from '@/lib/supabase/service';

const CURRICULUM_FEATURE_KEY = 'curriculum_feature';
const DEFAULT_ENABLED = false;

export async function isCurriculumEnabled(): Promise<boolean> {
  try {
    const supabase = createServiceClient() as any;
    const { data, error } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', CURRICULUM_FEATURE_KEY)
      .maybeSingle();

    if (error) throw error;
    return data?.value?.enabled === true;
  } catch (error) {
    console.warn('Curriculum feature gate fallback active:', error);
    return DEFAULT_ENABLED;
  }
}

export async function setCurriculumEnabled(enabled: boolean, updatedBy?: string) {
  const supabase = createServiceClient() as any;
  const { data, error } = await supabase
    .from('platform_settings')
    .upsert(
      {
        key: CURRICULUM_FEATURE_KEY,
        value: { enabled: enabled === true },
        updated_by: updatedBy || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    )
    .select('value')
    .single();

  if (error) throw error;
  return data?.value?.enabled === true;
}
