export type NotificationPreferenceKey =
  'studyReminders' | 'weakSubjectAlerts' | 'routineTestAlerts' | 'parentMessages' | 'studentChat' | 'achievements';

const DEFAULT_NOTIFICATION_PREFERENCES: Record<NotificationPreferenceKey, boolean> = {
  studyReminders: true,
  weakSubjectAlerts: true,
  routineTestAlerts: true,
  parentMessages: true,
  studentChat: true,
  achievements: true,
};

export type NotificationInsert = {
  user_id: string;
  type: 'ACHIEVEMENT' | 'STREAK' | 'REMINDER' | 'SYSTEM' | 'SOCIAL';
  title: string;
  message: string;
  icon_url?: string | null;
  link?: string | null;
  is_read?: boolean;
};

const DEFAULT_LINKS: Record<NotificationPreferenceKey, string> = {
  studyReminders: '/planner',
  weakSubjectAlerts: '/dashboard',
  routineTestAlerts: '/practice',
  parentMessages: '/settings?tab=parent-link',
  studentChat: '/student-chat',
  achievements: '/achievements',
};

function withDestination(key: NotificationPreferenceKey, notification: NotificationInsert) {
  return { is_read: false, ...notification, link: notification.link || DEFAULT_LINKS[key] };
}

async function notificationAllowed(db: any, userId: string, key: NotificationPreferenceKey) {
  try {
    const { data, error } = await db.from('profiles').select('notification_preferences').eq('id', userId).maybeSingle();
    if (error) return DEFAULT_NOTIFICATION_PREFERENCES[key];

    const preferences = data?.notification_preferences;
    if (!preferences || typeof preferences !== 'object') return DEFAULT_NOTIFICATION_PREFERENCES[key];
    const value = (preferences as Record<string, unknown>)[key];
    return typeof value === 'boolean' ? value : DEFAULT_NOTIFICATION_PREFERENCES[key];
  } catch {
    return DEFAULT_NOTIFICATION_PREFERENCES[key];
  }
}

export async function createNotificationIfEnabled(
  db: any,
  key: NotificationPreferenceKey,
  notification: NotificationInsert
) {
  if (!(await notificationAllowed(db, notification.user_id, key))) return { skipped: true };
  return db.from('notifications').insert(withDestination(key, notification));
}

export async function createNotificationsIfEnabled(
  db: any,
  key: NotificationPreferenceKey,
  notifications: NotificationInsert[]
) {
  const allowed: NotificationInsert[] = [];
  for (const notification of notifications) {
    if (await notificationAllowed(db, notification.user_id, key)) {
      allowed.push(withDestination(key, notification));
    }
  }
  if (!allowed.length) return { skipped: true };
  return db.from('notifications').insert(allowed);
}
