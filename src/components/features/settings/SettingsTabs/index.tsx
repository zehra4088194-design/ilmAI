'use client';
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import { createClient } from '@/lib/supabase/client';
import { BOARDS } from '@/lib/constants';
import { toast } from 'sonner';
import { User, Bell, Shield, Palette, Users, Languages, GraduationCap, HardDriveDownload } from 'lucide-react';
import { ParentMessageThread } from '@/components/ui/ParentMessageThread';
import { ParentAttachments } from '@/components/ui/ParentAttachments';
import { RoutineTestsWidget } from '@/components/ui/RoutineTestsWidget';
import { useTranslations, useLocale } from '@/providers/I18nProvider';
import { LOCALES, LOCALE_LABELS, type Locale } from '@/lib/i18n/config';
import { ClassSettingsCard } from '@/components/features/settings/ClassSettingsCard';
import {
  CLASS_SELECTION_GRADE_LEVELS,
  type GradeLevel,
  type ClassSelectionGradeLevel,
} from '@/lib/supabase/getUserGradeLevel';
import {
  EDUCATION_LEVELS,
  OUTPUT_STYLES,
  UNIVERSITY_STREAMS,
  type EducationLevel,
  type PreferredOutputStyle,
  type UniversityStream,
} from '@/lib/constants/university';
import { ThemePicker } from '@/components/common/ThemePicker';
import { useAuthStore } from '@/store/auth.store';
import { DownloadsClient } from '@/components/features/offline/DownloadsClient';
import { ParentQrScanner } from '@/components/features/parent/ParentQrScanner';
import Link from 'next/link';
import { disablePushNotifications, enablePushNotifications } from '@/lib/push/client';

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

type NotificationPreferenceKey = keyof typeof DEFAULT_NOTIFICATION_PREFERENCES;

function normalizeNotificationPreferences(source: unknown) {
  const value = source && typeof source === 'object' ? (source as Record<string, unknown>) : {};
  return Object.fromEntries(
    Object.entries(DEFAULT_NOTIFICATION_PREFERENCES).map(([key, fallback]) => [
      key,
      typeof value[key] === 'boolean' ? value[key] : fallback,
    ])
  ) as typeof DEFAULT_NOTIFICATION_PREFERENCES;
}

export function SettingsTabs({
  profile,
  currentGradeLevel,
  initialTab,
  initialLinkId,
  initialParentView,
}: {
  profile: any;
  currentGradeLevel: GradeLevel | null;
  initialTab?: string;
  initialLinkId?: string;
  initialParentView?: 'chat' | 'files';
}) {
  const [localProfile, setLocalProfile] = useState(profile);
  const [activeTab, setActiveTab] = useState(initialTab || 'profile');
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [gender, setGender] = useState<'girl' | 'boy' | null>(
    profile?.gender === 'girl' || profile?.gender === 'boy' ? profile.gender : null
  );
  const [genderChangedAt, setGenderChangedAt] = useState<string | null>(profile?.gender_changed_at || null);
  const [genderSaving, setGenderSaving] = useState(false);
  const [board, setBoard] = useState(profile?.board || '');
  const [educationLevel, setEducationLevel] = useState<EducationLevel>(profile?.education_level || 'school');
  const [universityStream, setUniversityStream] = useState<UniversityStream>(
    (profile?.university_stream as UniversityStream) || 'engineering'
  );
  const [universityDegree, setUniversityDegree] = useState(profile?.university_degree || '');
  const [program, setProgram] = useState(profile?.university_program || '');
  const [semester, setSemester] = useState(profile?.university_semester || '');
  const [courses, setCourses] = useState((profile?.university_courses || []).join(', '));
  const [examTargetDate, setExamTargetDate] = useState(profile?.university_exam_target_date || '');
  const [preferredOutputStyle, setPreferredOutputStyle] = useState<PreferredOutputStyle>(
    profile?.preferred_output_style || 'simple'
  );
  const [saving, setSaving] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [linking, setLinking] = useState(false);
  const [approvedLink, setApprovedLink] = useState<{ id: string; parent_id: string } | null>(null);
  const [loadingLink, setLoadingLink] = useState(true);
  const [notificationSaving, setNotificationSaving] = useState(false);
  const [notificationPreferences, setNotificationPreferences] = useState(() =>
    normalizeNotificationPreferences({
      ...(profile?.notification_preferences || {}),
      dailyStudyEmails: profile?.study_email_consent === true,
    })
  );
  const supabase = createClient();
  const { setTheme } = useTheme();
  const updateAuthUser = useAuthStore((state) => state.updateUser);
  const t = useTranslations();
  const { locale, setLocale } = useLocale();
  const profileGradeLevel = (localProfile?.grade_level || currentGradeLevel) as GradeLevel | null;
  const classSettingsGrade =
    profileGradeLevel && CLASS_SELECTION_GRADE_LEVELS.includes(profileGradeLevel as ClassSelectionGradeLevel)
      ? (profileGradeLevel as ClassSelectionGradeLevel)
      : null;

  const TABS = [
    { id: 'profile', label: t('settings.tabs.profile'), icon: User },
    { id: 'university', label: 'University Mode', icon: GraduationCap },
    { id: 'parent-link', label: t('settings.tabs.parentLink'), icon: Users },
    { id: 'notifications', label: t('settings.tabs.notifications'), icon: Bell },
    { id: 'security', label: t('settings.tabs.security'), icon: Shield },
    { id: 'appearance', label: t('settings.tabs.appearance'), icon: Palette },
    { id: 'downloads', label: 'Downloads', icon: HardDriveDownload },
    { id: 'language', label: t('settings.tabs.language'), icon: Languages },
  ];

  // Check if this student already has an approved parent link — if so, show
  // the live chat + routine tests instead of the "enter invite code" form.
  useEffect(() => {
    if (!localProfile?.id) return;
    let query = supabase
      .from('parent_student_links')
      .select('id, parent_id')
      .eq('student_id', localProfile.id)
      .eq('status', 'approved');
    if (initialLinkId) query = query.eq('id', initialLinkId);
    query.maybeSingle().then(({ data }) => {
      setApprovedLink(data);
      setLoadingLink(false);
    });
  }, [initialLinkId, localProfile?.id, supabase]);

  useEffect(() => {
    setLocalProfile(profile);
    setFullName(profile?.full_name || '');
    setGender(profile?.gender === 'girl' || profile?.gender === 'boy' ? profile.gender : null);
    setGenderChangedAt(profile?.gender_changed_at || null);
    setBoard(profile?.board || '');
    setEducationLevel(profile?.education_level || 'school');
    setUniversityStream((profile?.university_stream as UniversityStream) || 'engineering');
    setUniversityDegree(profile?.university_degree || '');
  }, [profile]);

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        board,
        education_level: educationLevel,
        updated_at: new Date().toISOString(),
      })
      .eq('id', localProfile.id);
    if (error) toast.error(error.message);
    else {
      setLocalProfile((current: any) => ({
        ...current,
        full_name: fullName,
        board,
        education_level: educationLevel,
        updated_at: new Date().toISOString(),
      }));
      toast.success('Profile updated.');
    }
    setSaving(false);
  };

  const handleGenderChange = async (nextGender: 'girl' | 'boy') => {
    if (gender === nextGender || genderSaving) return;
    setGenderSaving(true);
    try {
      const res = await fetch('/api/profile/gender', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gender: nextGender }),
      });
      const json = await res.json();
      if (!res.ok || json.status === 'error') {
        toast.error(json.error || 'Gender could not be updated.');
        return;
      }
      setGender(nextGender);
      setGenderChangedAt(json.data.genderChangedAt);
      setLocalProfile((current: any) => ({
        ...current,
        gender: nextGender,
        gender_changed_at: json.data.genderChangedAt,
      }));
      updateAuthUser({ gender: nextGender, genderChangedAt: json.data.genderChangedAt });
      if (!window.localStorage.getItem('ilm-ai-theme-explicit')) {
        setTheme(nextGender === 'girl' ? 'theme-pink-light' : 'theme-midnight-dark');
      }
      toast.success('Gender setting updated. You can change it again after 7 days.');
    } catch {
      toast.error('Gender could not be updated.');
    } finally {
      setGenderSaving(false);
    }
  };

  const handleUniversitySave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        education_level: educationLevel,
        university_stream: universityStream,
        university_degree: universityDegree.trim() || null,
        university_program: program.trim() || null,
        university_semester: semester.trim() || null,
        university_courses: courses
          .split(',')
          .map((course: string) => course.trim())
          .filter(Boolean)
          .slice(0, 12),
        university_exam_target_date: examTargetDate || null,
        preferred_output_style: preferredOutputStyle,
        is_profile_complete:
          educationLevel === 'university' && program.trim() && semester.trim()
            ? true
            : localProfile?.is_profile_complete,
        onboarding_completed:
          educationLevel === 'university' && program.trim() && semester.trim()
            ? true
            : localProfile?.onboarding_completed,
        updated_at: new Date().toISOString(),
      })
      .eq('id', localProfile.id);
    if (error) toast.error(error.message);
    else {
      setLocalProfile((current: any) => ({
        ...current,
        education_level: educationLevel,
        university_stream: universityStream,
        university_degree: universityDegree.trim() || null,
        university_program: program.trim() || null,
        university_semester: semester.trim() || null,
        university_courses: courses
          .split(',')
          .map((course: string) => course.trim())
          .filter(Boolean)
          .slice(0, 12),
        university_exam_target_date: examTargetDate || null,
        preferred_output_style: preferredOutputStyle,
        updated_at: new Date().toISOString(),
      }));
      toast.success('University settings saved.');
    }
    setSaving(false);
  };

  const handleClassChange = (gradeLevel: ClassSelectionGradeLevel, nextEducationLevel: string) => {
    setLocalProfile((current: any) => ({
      ...current,
      grade_level: gradeLevel,
      education_level: nextEducationLevel,
      onboarding_completed: true,
      is_profile_complete: true,
      updated_at: new Date().toISOString(),
    }));
    setEducationLevel(nextEducationLevel as EducationLevel);
  };

  const toggleNotificationPreference = (key: NotificationPreferenceKey) => {
    setNotificationPreferences((current) => ({ ...current, [key]: !current[key] }));
  };

  const handleNotificationSave = async () => {
    setNotificationSaving(true);
    try {
      const pushResult = notificationPreferences.browserNotifications
        ? await enablePushNotifications()
        : await disablePushNotifications().then(() => ({ status: 'disabled' as const }));
      const res = await fetch('/api/preferences/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences: notificationPreferences }),
      });
      const json = await res.json();
      if (json.status === 'error') {
        toast.error(json.error);
        return;
      }
      setNotificationPreferences(normalizeNotificationPreferences(json.data?.preferences));
      if (pushResult.status === 'denied') {
        toast.warning('Preferences saved, but browser notification permission was denied.');
      } else {
        toast.success('Notification preferences saved.');
      }
    } catch {
      toast.error('Notification preferences could not be saved.');
    } finally {
      setNotificationSaving(false);
    }
  };

  const handleLanguageChange = async (nextLocale: Locale) => {
    if (locale === nextLocale) return;
    const previousLocale = locale;
    setLocale(nextLocale);
    const { error } = await (supabase.from('profiles') as any)
      .update({ preferred_language: nextLocale, updated_at: new Date().toISOString() })
      .eq('id', localProfile.id);
    if (error) {
      setLocale(previousLocale);
      toast.error('Language preference could not be saved. Check the database migration.');
      return;
    }
    setLocalProfile((current: any) => ({ ...current, preferred_language: nextLocale }));
    toast.success(nextLocale === 'en' ? 'Language changed to English.' : 'Language changed to Roman Urdu.');
  };

  const handleLinkParent = async () => {
    if (!inviteCode.trim()) {
      toast.error('Invite code likho');
      return;
    }
    setLinking(true);
    try {
      const res = await fetch('/api/parent/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: inviteCode.trim() }),
      });
      const json = await res.json();
      if (json.status === 'error') {
        toast.error(json.error);
        return;
      }
      toast.success(json.message);
      setInviteCode('');
      // Refresh link status so chat/routine widgets appear immediately
      const { data } = await supabase
        .from('parent_student_links')
        .select('id, parent_id')
        .eq('student_id', localProfile.id)
        .eq('status', 'approved')
        .maybeSingle();
      setApprovedLink(data);
    } catch {
      toast.error('Something went wrong.');
    } finally {
      setLinking(false);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-[200px_1fr]">
      <div className="space-y-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              activeTab === tab.id ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent/50'
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>
      <Card>
        <CardContent className="p-6">
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Full Name</label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              {localProfile?.role === 'student' && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium">You are</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['girl', 'boy'] as const).map((value) => (
                      <button
                        key={value}
                        type="button"
                        disabled={genderSaving}
                        aria-pressed={gender === value}
                        onClick={() => handleGenderChange(value)}
                        className={cn(
                          'rounded-xl border-2 px-3 py-2.5 text-sm font-semibold capitalize transition-all disabled:opacity-50',
                          gender === value
                            ? value === 'girl'
                              ? 'border-pink-500 bg-pink-500/15 text-pink-500'
                              : 'border-emerald-500 bg-emerald-500/15 text-emerald-500'
                            : 'border-border text-muted-foreground'
                        )}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                  <p className="text-muted-foreground mt-1.5 text-xs">
                    For privacy, Study Buddies matches students of the same gender. This setting can be changed only
                    once every 7 days.
                    {genderChangedAt
                      ? ` Next change: ${new Date(new Date(genderChangedAt).getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleString()}.`
                      : ''}
                  </p>
                </div>
              )}
              <div>
                <label className="mb-1.5 block text-sm font-medium">Board</label>
                <select
                  value={board}
                  onChange={(e) => setBoard(e.target.value)}
                  className="border-input bg-background h-10 w-full rounded-lg border px-3 text-sm"
                >
                  <option value="">Select board</option>
                  {BOARDS.map((b) => (
                    <option key={b.value} value={b.value}>
                      {b.label}
                    </option>
                  ))}
                </select>
              </div>
              <Button variant="gradient" onClick={handleSave} loading={saving}>
                Save Changes
              </Button>
              {classSettingsGrade && (
                <ClassSettingsCard currentGradeLevel={classSettingsGrade} onClassChange={handleClassChange} />
              )}
            </div>
          )}
          {activeTab === 'university' && (
            <div className="space-y-5">
              <div>
                <h3 className="mb-1 flex items-center gap-2 font-semibold">
                  <GraduationCap className="h-4 w-4 text-violet-400" />
                  Education Level
                </h3>
                <p className="text-muted-foreground text-sm">
                  Selecting University Mode adds assignment, essay, presentation, viva, and semester tools to your
                  dashboard.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {EDUCATION_LEVELS.map((level) => (
                  <button
                    key={level.value}
                    onClick={() => setEducationLevel(level.value)}
                    className={cn(
                      'rounded-xl border p-3 text-left transition-colors',
                      educationLevel === level.value
                        ? 'border-violet-500 bg-violet-500/10'
                        : 'border-border hover:border-violet-500/30'
                    )}
                  >
                    <span className="block text-sm font-semibold">{level.label}</span>
                    <span className="text-muted-foreground text-xs">{level.description}</span>
                  </button>
                ))}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Section</label>
                  <select
                    value={universityStream}
                    onChange={(e) => {
                      setUniversityStream(e.target.value as UniversityStream);
                      setUniversityDegree('');
                    }}
                    className="border-input bg-background h-10 w-full rounded-lg border px-3 text-sm"
                  >
                    {UNIVERSITY_STREAMS.map((stream) => (
                      <option key={stream.value} value={stream.value}>
                        {stream.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Degree</label>
                  <select
                    value={universityDegree}
                    onChange={(e) => setUniversityDegree(e.target.value)}
                    className="border-input bg-background h-10 w-full rounded-lg border px-3 text-sm"
                  >
                    <option value="">Select degree</option>
                    {(UNIVERSITY_STREAMS.find((stream) => stream.value === universityStream)?.degrees || []).map(
                      (degree) => (
                        <option key={degree} value={degree}>
                          {degree}
                        </option>
                      )
                    )}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Program label</label>
                  <Input
                    value={program}
                    onChange={(e) => setProgram(e.target.value)}
                    placeholder="MBBS 2nd Year / BSCS Regular"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Semester</label>
                  <Input value={semester} onChange={(e) => setSemester(e.target.value)} placeholder="Semester 5" />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium">Subjects / Courses</label>
                  <Input
                    value={courses}
                    onChange={(e) => setCourses(e.target.value)}
                    placeholder="AI, Software Engineering, Statistics"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Exam target date</label>
                  <Input type="date" value={examTargetDate} onChange={(e) => setExamTargetDate(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Preferred output style</label>
                  <select
                    value={preferredOutputStyle}
                    onChange={(e) => setPreferredOutputStyle(e.target.value as PreferredOutputStyle)}
                    className="border-input bg-background h-10 w-full rounded-lg border px-3 text-sm"
                  >
                    {OUTPUT_STYLES.map((style) => (
                      <option key={style.value} value={style.value}>
                        {style.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-300">
                Use AI output as a study draft. Review, personalize, and verify before submission.
              </div>
              <Button variant="gradient" onClick={handleUniversitySave} loading={saving}>
                Save University Mode
              </Button>
            </div>
          )}
          {activeTab === 'parent-link' && (
            <div className="space-y-4">
              <div>
                <h3 className="mb-1 flex items-center gap-2 font-semibold">
                  <Users className="h-4 w-4 text-violet-400" />
                  Link a Parent
                </h3>
                <p className="text-muted-foreground mb-4 text-sm">
                  Ask your parent for an invite code and enter it here so they can view your progress.
                </p>
              </div>
              {loadingLink ? (
                <p className="text-muted-foreground text-sm">Loading...</p>
              ) : approvedLink ? (
                <div className="space-y-4">
                  <div className="rounded-lg bg-green-500/10 px-3 py-2 text-sm text-green-500">
                    You are linked to your parent, who can now view your progress.
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <ParentMessageThread
                      linkId={approvedLink.id}
                      currentUserId={localProfile.id}
                      autoOpen={initialParentView === 'chat'}
                    />
                    <ParentAttachments
                      linkId={approvedLink.id}
                      currentUserId={localProfile.id}
                      autoOpen={initialParentView === 'files'}
                    />
                  </div>
                  <RoutineTestsWidget studentId={localProfile.id} />
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    <Input
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                      placeholder="e.g. SV-A1B2C3"
                      className="font-mono"
                    />
                    <Button variant="gradient" onClick={handleLinkParent} loading={linking}>
                      Link Parent
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-border h-px flex-1" />
                    <span className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">
                      or
                    </span>
                    <span className="bg-border h-px flex-1" />
                  </div>
                  <ParentQrScanner />
                  <p className="text-muted-foreground text-xs">
                    Your parent can create this code by selecting &ldquo;Generate Invite Code&rdquo; on their dashboard.
                  </p>
                </>
              )}
            </div>
          )}
          {activeTab === 'notifications' && (
            <div className="space-y-5">
              <div>
                <h3 className="mb-1 flex items-center gap-2 font-semibold">
                  <Bell className="h-4 w-4 text-violet-400" />
                  Notification Preferences
                </h3>
                <p className="text-muted-foreground text-sm">
                  Choose exactly which ilm AI alerts you want. Daily study emails are synced with your email consent.
                </p>
              </div>
              <div className="grid gap-3">
                <NotificationToggle
                  title="Browser notifications"
                  description="Allow this browser to show realtime alerts when supported."
                  checked={notificationPreferences.browserNotifications}
                  onClick={() => toggleNotificationPreference('browserNotifications')}
                />
                <NotificationToggle
                  title="Study reminders"
                  description="Daily planner nudges and missed-study reminders."
                  checked={notificationPreferences.studyReminders}
                  onClick={() => toggleNotificationPreference('studyReminders')}
                />
                <NotificationToggle
                  title="Weak subject alerts"
                  description="Alerts when recent marks show a subject needs attention."
                  checked={notificationPreferences.weakSubjectAlerts}
                  onClick={() => toggleNotificationPreference('weakSubjectAlerts')}
                />
                <NotificationToggle
                  title="Routine test alerts"
                  description="Parent or teacher assigned routine-test reminders."
                  checked={notificationPreferences.routineTestAlerts}
                  onClick={() => toggleNotificationPreference('routineTestAlerts')}
                />
                <NotificationToggle
                  title="Parent messages"
                  description="Chat and parent-link updates from your parent dashboard."
                  checked={notificationPreferences.parentMessages}
                  onClick={() => toggleNotificationPreference('parentMessages')}
                />
                <NotificationToggle
                  title="Study buddy messages"
                  description="Incoming requests, approvals and chat notifications."
                  checked={notificationPreferences.studentChat}
                  onClick={() => toggleNotificationPreference('studentChat')}
                />
                <NotificationToggle
                  title="Achievements"
                  description="XP, streak and milestone celebration alerts."
                  checked={notificationPreferences.achievements}
                  onClick={() => toggleNotificationPreference('achievements')}
                />
                <NotificationToggle
                  title="Daily study emails"
                  description="A short focus email with task and motivation when email delivery is configured."
                  checked={notificationPreferences.dailyStudyEmails}
                  onClick={() => toggleNotificationPreference('dailyStudyEmails')}
                />
              </div>
              <Button variant="gradient" onClick={handleNotificationSave} loading={notificationSaving}>
                Save Notifications
              </Button>
            </div>
          )}
          {activeTab === 'security' && (
            <p className="text-muted-foreground text-sm">Password change and 2FA settings are coming soon.</p>
          )}
          {activeTab === 'appearance' && (
            <div className="space-y-4">
              <div>
                <h3 className="mb-1 flex items-center gap-2 font-semibold">
                  <Palette className="h-4 w-4 text-violet-400" />
                  Theme
                </h3>
                <p className="text-muted-foreground text-sm">
                  Choose your study style. The server loads only this theme&apos;s light/dark pair on the next page load.
                </p>
              </div>
              <ThemePicker />
            </div>
          )}
          {activeTab === 'downloads' &&
            (localProfile?.subscription_tier === 'FREE' ? (
              <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-5">
                <h3 className="font-semibold">App-only Downloads are a Pro feature</h3>
                <p className="text-muted-foreground mt-1 text-sm">
                  Pro and Elite files can be saved and read in the app&apos;s private offline storage.
                </p>
                <Button asChild variant="gradient" className="mt-4">
                  <Link href="/subscription">View Pro Plans</Link>
                </Button>
              </div>
            ) : (
              <DownloadsClient embedded />
            ))}
          {activeTab === 'language' && (
            <div className="space-y-4">
              <div>
                <h3 className="mb-1 flex items-center gap-2 font-semibold">
                  <Languages className="h-4 w-4 text-violet-400" />
                  {t('settings.language.title')}
                </h3>
                <p className="text-muted-foreground mb-4 text-sm">{t('settings.language.description')}</p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {LOCALES.map((value: Locale) => (
                  <button
                    key={value}
                    onClick={() => void handleLanguageChange(value)}
                    className={cn(
                      'flex items-center justify-center gap-2 rounded-xl border-2 p-3 text-sm font-medium transition-all',
                      locale === value
                        ? 'text-foreground border-violet-500 bg-violet-500/10'
                        : 'border-border text-muted-foreground hover:border-violet-500/30'
                    )}
                  >
                    {LOCALE_LABELS[value]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function NotificationToggle({
  title,
  description,
  checked,
  onClick,
}: {
  title: string;
  description: string;
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center justify-between gap-4 rounded-xl border p-4 text-left transition-colors',
        checked ? 'border-violet-500/60 bg-violet-500/10' : 'border-border bg-card hover:border-violet-500/30'
      )}
    >
      <span>
        <span className="block text-sm font-semibold">{title}</span>
        <span className="text-muted-foreground mt-1 block text-xs leading-5">{description}</span>
      </span>
      <span
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full border transition-colors',
          checked ? 'bg-violet-600' : 'bg-muted'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0.5'
          )}
        />
      </span>
    </button>
  );
}
