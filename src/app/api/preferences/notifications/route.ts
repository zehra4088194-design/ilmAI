import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const DEFAULT_NOTIFICATION_PREFERENCES = {
  browserNotifications: true,
  studyReminders: true,
  weakSubjectAlerts: true,
  routineTestAlerts: true,
  parentMessages: true,
  studentChat: true,
  achievements: true,
  dailyStudyEmails: false,
};

type NotificationPreferences = typeof DEFAULT_NOTIFICATION_PREFERENCES;
type ProfilePreferenceRow = {
  notification_preferences?: unknown;
  study_email_consent?: boolean | null;
};
type PreferenceQueryResult<T> = Promise<{ data: T | null; error: { message?: string } | null }>;
type ProfilePreferencesTable = {
  select: (columns: string) => {
    eq: (column: string, value: string) => {
      single: () => PreferenceQueryResult<ProfilePreferenceRow>;
    };
  };
  update: (values: Record<string, unknown>) => {
    eq: (column: string, value: string) => PreferenceQueryResult<null>;
  };
};

function normalizePreferences(value: unknown): NotificationPreferences {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return Object.fromEntries(
    Object.entries(DEFAULT_NOTIFICATION_PREFERENCES).map(([key, fallback]) => [key, typeof source[key] === 'boolean' ? source[key] : fallback])
  ) as NotificationPreferences;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ status: 'error', error: 'Login required' }, { status: 401 });

  const profiles = supabase.from('profiles') as unknown as ProfilePreferencesTable;
  const { data, error } = await profiles
    .select('notification_preferences, study_email_consent')
    .eq('id', user.id)
    .single();

  if (error) return NextResponse.json({ status: 'error', error: 'Preferences could not be loaded.' }, { status: 500 });
  const storedPreferences = data?.notification_preferences && typeof data.notification_preferences === 'object'
    ? data.notification_preferences as Record<string, unknown>
    : {};
  const preferences = normalizePreferences({ ...storedPreferences, dailyStudyEmails: data?.study_email_consent === true });

  return NextResponse.json({ status: 'success', data: { preferences } });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ status: 'error', error: 'Login required' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const preferences = normalizePreferences(body.preferences);

  const profiles = supabase.from('profiles') as unknown as ProfilePreferencesTable;
  const { error } = await profiles
    .update({
      notification_preferences: preferences,
      study_email_consent: preferences.dailyStudyEmails,
      study_email_unsubscribed_at: preferences.dailyStudyEmails ? null : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (error) return NextResponse.json({ status: 'error', error: 'Notification preferences could not be saved.' }, { status: 500 });
  return NextResponse.json({ status: 'success', data: { preferences } });
}
