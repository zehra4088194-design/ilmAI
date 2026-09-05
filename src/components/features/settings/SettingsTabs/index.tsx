'use client';
import { useEffect, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import { createClient } from '@/lib/supabase/client';
import { BOARDS } from '@/lib/constants';
import { toast } from 'sonner';
import {
  User,
  Bell,
  Shield,
  Palette,
  Users,
  Languages,
  GraduationCap,
  HardDriveDownload,
  KeyRound,
  Smartphone,
  Trash2,
  Camera,
} from 'lucide-react';
import { ParentMessageThread } from '@/components/ui/ParentMessageThread';
import { ParentAttachments } from '@/components/ui/ParentAttachments';
import { RoutineTestsWidget } from '@/components/ui/RoutineTestsWidget';
import { useTranslations, useLocale } from '@/providers/I18nProvider';
import { LOCALES, LOCALE_LABELS, type Locale } from '@/lib/i18n/config';
import { ClassSettingsCard } from '@/components/features/settings/ClassSettingsCard';
import Link from 'next/link';
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
import { disablePushNotifications, enablePushNotifications } from '@/lib/push/client';

const DEFAULT_NOTIFICATION_PREFERENCES = {
  browserNotifications: true,
  studyReminders: true,
  weakSubjectAlerts: true,
  routineTestAlerts: true,
  parentMessages: true,
  studentChat: true,
  achievements: true,
  schoolJoinRequests: true,
  dailyStudyEmails: false,
};

type NotificationPreferenceKey = keyof typeof DEFAULT_NOTIFICATION_PREFERENCES;
type MfaFactor = {
  id: string;
  status: string;
  friendly_name?: string | null;
  factor_type?: string;
};

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
  autoStartMfa,
  continueAfterMfaHref,
}: {
  profile: any;
  currentGradeLevel: GradeLevel | null;
  initialTab?: string;
  initialLinkId?: string;
  initialParentView?: 'chat' | 'files';
  // Landed here from RegisterForm's "Enable 2-step verification after signup" checkbox
  // (?tab=security&mfa=start&next=...) — auto-opens the QR enrollment instead of making the new
  // user find and click "Enable 2FA" themselves right after creating their account.
  autoStartMfa?: boolean;
  continueAfterMfaHref?: string | null;
}) {
  const [localProfile, setLocalProfile] = useState(profile);
  const [activeTab, setActiveTab] = useState(initialTab || 'profile');
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [username, setUsername] = useState(profile?.username || '');
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [dateOfBirth, setDateOfBirth] = useState(profile?.date_of_birth || '');
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
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
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
  const [mfaFactors, setMfaFactors] = useState<MfaFactor[]>([]);
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaSaving, setMfaSaving] = useState(false);
  const [mfaEnrollment, setMfaEnrollment] = useState<{ factorId: string; qrCode: string; secret?: string } | null>(
    null
  );
  const [mfaCode, setMfaCode] = useState('');
  const supabase = createClient();
  const { setTheme } = useTheme();
  const updateAuthUser = useAuthStore((state) => state.updateUser);
  const t = useTranslations();
  const { locale, setLocale } = useLocale();
  const verifiedMfaFactor = mfaFactors.find((factor) => factor.status === 'verified');
  const profileGradeLevel = (localProfile?.grade_level || currentGradeLevel) as GradeLevel | null;
  // Once a profile is in University Mode, grade_level is a leftover from before they switched (or
  // from before they ever set it) — showing "Current Class: Grade 12" here has nothing behind it,
  // and its "Change" button (setGradeLevel, src/app/onboarding/class/actions.ts) unconditionally
  // recomputes education_level from the picked grade, silently kicking the profile back out of
  // University Mode. Gating on educationLevel here (not just grade_level) keeps the card reachable
  // for anyone who switches back out of University Mode, while hiding it while they're in it.
  const classSettingsGrade =
    localProfile?.role === 'student' &&
    educationLevel !== 'university' &&
    profileGradeLevel &&
    CLASS_SELECTION_GRADE_LEVELS.includes(profileGradeLevel as ClassSelectionGradeLevel)
      ? (profileGradeLevel as ClassSelectionGradeLevel)
      : null;

  // University Mode (degree/semester self-tagging) and Parent Link (student-to-parent invite
  // code) are both purely consumer-student concepts. They make no sense for role === 'teacher'
  // — whether that's a real individual teacher or a school/college member mapped to 'teacher'
  // (see mapInstitutionRoleToProfileRole.ts) — so both are hidden for that role.
  const isTeacherRole = localProfile?.role === 'teacher';
  const TABS = [
    { id: 'profile', label: t('settings.tabs.profile'), icon: User },
    ...(isTeacherRole ? [] : [{ id: 'university', label: 'University Mode', icon: GraduationCap }]),
    ...(isTeacherRole ? [] : [{ id: 'parent-link', label: t('settings.tabs.parentLink'), icon: Users }]),
    { id: 'notifications', label: t('settings.tabs.notifications'), icon: Bell },
    { id: 'security', label: t('settings.tabs.security'), icon: Shield },
    { id: 'appearance', label: t('settings.tabs.appearance'), icon: Palette },
    { id: 'downloads', label: 'Downloads', icon: HardDriveDownload },
    { id: 'language', label: t('settings.tabs.language'), icon: Languages },
    { id: 'delete-account', label: 'Delete Account', icon: Trash2 },
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
    setUsername(profile?.username || '');
    setDateOfBirth(profile?.date_of_birth || '');
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

  const loadMfaFactors = async () => {
    setMfaLoading(true);
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) {
      toast.error(error.message);
    } else {
      setMfaFactors(
        ((data?.totp || []) as MfaFactor[]).filter((factor) => factor.factor_type === 'totp' || !factor.factor_type)
      );
    }
    setMfaLoading(false);
  };

  useEffect(() => {
    if (activeTab === 'security') void loadMfaFactors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleSave = async () => {
    const trimmedUsername = username.trim().toLowerCase();
    if (!/^[a-z0-9._]{3,30}$/i.test(trimmedUsername)) {
      toast.error('Username must be 3-30 characters: letters, numbers, dots, or underscores.');
      return;
    }
    setSaving(true);
    // Only re-check availability when it actually changed — /api/auth/check-username has no
    // notion of "this is your own current username", so re-checking an unchanged value would
    // always report it as taken.
    if (trimmedUsername !== (localProfile?.username || '').toLowerCase()) {
      setCheckingUsername(true);
      try {
        const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(trimmedUsername)}`);
        const json = await res.json();
        if (!json.available) {
          toast.error(json.error || 'That username is already taken.');
          setSaving(false);
          setCheckingUsername(false);
          return;
        }
      } catch {
        toast.error('Could not verify username availability. Please try again.');
        setSaving(false);
        setCheckingUsername(false);
        return;
      }
      setCheckingUsername(false);
    }
    const { error } = await (supabase.from('profiles') as any)
      .update({
        full_name: fullName,
        username: trimmedUsername,
        date_of_birth: dateOfBirth || null,
        board,
        education_level: educationLevel,
        updated_at: new Date().toISOString(),
      })
      .eq('id', localProfile.id);
    if (error) toast.error(error.message);
    else {
      setUsername(trimmedUsername);
      setLocalProfile((current: any) => ({
        ...current,
        full_name: fullName,
        username: trimmedUsername,
        date_of_birth: dateOfBirth || null,
        board,
        education_level: educationLevel,
        updated_at: new Date().toISOString(),
      }));
      toast.success('Profile updated.');
    }
    setSaving(false);
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Select an image file.');
      return;
    }
    setAvatarUploading(true);
    try {
      const body = new FormData();
      body.set('file', file);
      const response = await fetch('/api/profile/avatar', { method: 'POST', body });
      const json = await response.json();
      if (!response.ok || json.status === 'error') {
        toast.error(json.error || 'Could not update your profile picture.');
        return;
      }
      setLocalProfile((current: any) => ({ ...current, avatar_url: json.data.avatarUrl }));
      updateAuthUser({ avatarUrl: json.data.avatarUrl });
      toast.success('Profile picture updated.');
    } catch {
      toast.error('Could not update your profile picture.');
    } finally {
      setAvatarUploading(false);
    }
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

  const startMfaEnrollment = async () => {
    setMfaSaving(true);
    setMfaEnrollment(null);
    setMfaCode('');
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'ilm AI Authenticator',
    });
    if (error) {
      toast.error(error.message);
    } else {
      const enrollment = data as unknown as { id: string; totp?: { qr_code?: string; secret?: string } };
      setMfaEnrollment({
        factorId: enrollment.id,
        qrCode: enrollment.totp?.qr_code || '',
        secret: enrollment.totp?.secret,
      });
    }
    setMfaSaving(false);
  };

  // autoStartMfa (?tab=security&mfa=start) fires this once, only after factors have actually
  // loaded and confirmed nothing is enrolled yet — without the mfaLoading/verifiedMfaFactor guard
  // this would also fire for someone who already has MFA and is just revisiting the link.
  const [autoMfaStarted, setAutoMfaStarted] = useState(false);
  useEffect(() => {
    if (!autoStartMfa || autoMfaStarted || mfaLoading || activeTab !== 'security') return;
    if (verifiedMfaFactor || mfaEnrollment) return;
    setAutoMfaStarted(true);
    void startMfaEnrollment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStartMfa, autoMfaStarted, mfaLoading, activeTab, verifiedMfaFactor, mfaEnrollment]);

  const verifyMfaEnrollment = async () => {
    if (!mfaEnrollment || mfaCode.trim().length < 6) {
      toast.error('Enter the 6-digit code from your authenticator app.');
      return;
    }
    setMfaSaving(true);
    const challenge = await supabase.auth.mfa.challenge({ factorId: mfaEnrollment.factorId });
    if (challenge.error) {
      toast.error(challenge.error.message);
      setMfaSaving(false);
      return;
    }
    const { error } = await supabase.auth.mfa.verify({
      factorId: mfaEnrollment.factorId,
      challengeId: challenge.data.id,
      code: mfaCode.trim(),
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Two-step verification enabled.');
      setMfaEnrollment(null);
      setMfaCode('');
      await loadMfaFactors();
    }
    setMfaSaving(false);
  };

  const disableMfa = async (factorId: string) => {
    setMfaSaving(true);
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Two-step verification disabled.');
      await loadMfaFactors();
    }
    setMfaSaving(false);
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
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={avatarUploading}
                  className="group border-border bg-muted relative h-16 w-16 shrink-0 overflow-hidden rounded-full border disabled:opacity-60"
                  aria-label="Change profile picture"
                >
                  {localProfile?.avatar_url ? (
                    <Image src={localProfile.avatar_url} alt="" fill sizes="64px" className="object-cover" />
                  ) : (
                    <span className="text-muted-foreground flex h-full w-full items-center justify-center text-lg font-bold uppercase">
                      {(localProfile?.full_name || '?').charAt(0)}
                    </span>
                  )}
                  <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                    <Camera className="h-5 w-5 text-white" />
                  </span>
                </button>
                <div>
                  <Button type="button" variant="outline" size="sm" onClick={() => avatarInputRef.current?.click()} loading={avatarUploading}>
                    Change profile picture
                  </Button>
                  <p className="text-muted-foreground mt-1 text-xs">PNG, JPG, WEBP or GIF, up to 4MB.</p>
                </div>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Full Name</label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Username</label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  placeholder="e.g. ahmad.study"
                />
                <p className="text-muted-foreground mt-1.5 text-xs">
                  People can find you by this @username in search and Study Buddies.
                </p>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Date of Birth</label>
                <Input type="date" value={dateOfBirth || ''} onChange={(e) => setDateOfBirth(e.target.value)} />
                <p className="text-muted-foreground mt-1.5 text-xs">
                  Used to show the Kids Dashboard automatically for accounts under 8 years old.
                </p>
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
              {localProfile?.role === 'student' && educationLevel !== 'university' && (
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
              )}
              <Button variant="gradient" onClick={handleSave} loading={saving || checkingUsername}>
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
                  title="School join requests"
                  description="New student and teacher requests to join your institution (school owners and admins)."
                  checked={notificationPreferences.schoolJoinRequests}
                  onClick={() => toggleNotificationPreference('schoolJoinRequests')}
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
            <div className="space-y-8">
              {continueAfterMfaHref && (
                <div className="border-primary/25 bg-primary/5 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
                  <p className="text-sm">
                    {verifiedMfaFactor
                      ? 'Two-step verification is set up.'
                      : 'Set up two-step verification now, or continue and enable it later.'}
                  </p>
                  <Button asChild variant={verifiedMfaFactor ? 'gradient' : 'outline'} size="sm">
                    <Link href={continueAfterMfaHref}>{verifiedMfaFactor ? 'Continue' : 'Skip for now'}</Link>
                  </Button>
                </div>
              )}
              <ChangePasswordCard email={localProfile?.email || profile?.email || ''} mfaVerified={Boolean(verifiedMfaFactor)} />
              <SecuritySettings
                loading={mfaLoading}
                saving={mfaSaving}
                factors={mfaFactors}
                enrollment={mfaEnrollment}
                code={mfaCode}
                onCodeChange={setMfaCode}
                onStartEnrollment={startMfaEnrollment}
                onVerifyEnrollment={verifyMfaEnrollment}
                onDisable={disableMfa}
              />
            </div>
          )}
          {activeTab === 'appearance' && (
            <div className="space-y-4">
              <div>
                <h3 className="mb-1 flex items-center gap-2 font-semibold">
                  <Palette className="h-4 w-4 text-violet-400" />
                  Theme
                </h3>
                <p className="text-muted-foreground text-sm">
                  Choose your study style. The server loads only this theme&apos;s light/dark pair on the next page
                  load.
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
          {activeTab === 'delete-account' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
                <div className="flex gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-500/10">
                    <Trash2 className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-red-600 dark:text-red-400">Delete Your Account</p>
                    <p className="text-muted-foreground mt-1 text-xs leading-5">
                      Permanently delete your ilm AI account and all associated data. This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm">
                  If you decide to delete your account, we'll permanently remove:
                </p>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li>Your profile and personal information</li>
                  <li>All study progress and marks</li>
                  <li>Flashcard decks and notes</li>
                  <li>Quiz attempts and game progress</li>
                  <li>All messages and conversations</li>
                </ul>
              </div>

              <Button asChild variant="destructive">
                <Link href="/settings/delete-account">Proceed to Delete Account</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Password change was previously only reachable through the /reset-password recovery flow —
// there was no way to change it from an already-authenticated session. supabase.auth.updateUser
// doesn't require the current password by default (the session alone authorizes it), which is
// weaker than the owner wanted here, so this re-authenticates with the current password first
// (signInWithPassword) before calling updateUser. For an MFA-enrolled account, the current
// authenticator code is also required (mfa.challenge + mfa.verify) before the password call —
// otherwise a stolen session alone could change the password and lock the real owner out.
function ChangePasswordCard({ email, mfaVerified }: { email: string; mfaVerified: boolean }) {
  const supabase = createClient();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentPassword) {
      toast.error('Enter your current password.');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('The new passwords do not match.');
      return;
    }
    if (mfaVerified && mfaCode.trim().length < 6) {
      toast.error('Enter the 6-digit code from your authenticator app.');
      return;
    }
    setSaving(true);
    try {
      if (!email) {
        toast.error('Could not verify your account email. Reload the page and try again.');
        return;
      }
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (reauthError) {
        toast.error('Current password is incorrect.');
        return;
      }

      if (mfaVerified) {
        const factors = await supabase.auth.mfa.listFactors();
        const factorId = factors.data?.totp?.find((factor) => factor.status === 'verified')?.id;
        if (!factorId) {
          toast.error('Two-step verification factor could not be found. Reload the page and try again.');
          return;
        }
        const challenge = await supabase.auth.mfa.challenge({ factorId });
        if (challenge.error) {
          toast.error(challenge.error.message);
          return;
        }
        const verify = await supabase.auth.mfa.verify({
          factorId,
          challengeId: challenge.data.id,
          code: mfaCode.trim(),
        });
        if (verify.error) {
          toast.error('Incorrect authenticator code.');
          return;
        }
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success('Password updated.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setMfaCode('');
    } catch {
      toast.error('Password could not be changed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border-border bg-card rounded-xl border p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-500/10">
          <KeyRound className="h-5 w-5 text-violet-400" />
        </div>
        <div>
          <p className="text-sm font-semibold">Change password</p>
          <p className="text-muted-foreground mt-1 text-xs leading-5">
            Confirm your current password{mfaVerified ? ' and authenticator code' : ''} to set a new one.
          </p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <Input
          type="password"
          autoComplete="current-password"
          placeholder="Current password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            type="password"
            autoComplete="new-password"
            placeholder="New password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
          <Input
            type="password"
            autoComplete="new-password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        </div>
        {mfaVerified && (
          <Input
            value={mfaCode}
            onChange={(event) => setMfaCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="6-digit authenticator code"
            className="font-mono tracking-widest"
          />
        )}
        <Button type="submit" variant="gradient" size="sm" loading={saving}>
          Update password
        </Button>
      </form>
    </div>
  );
}

function SecuritySettings({
  loading,
  saving,
  factors,
  enrollment,
  code,
  onCodeChange,
  onStartEnrollment,
  onVerifyEnrollment,
  onDisable,
}: {
  loading: boolean;
  saving: boolean;
  factors: MfaFactor[];
  enrollment: { factorId: string; qrCode: string; secret?: string } | null;
  code: string;
  onCodeChange: (value: string) => void;
  onStartEnrollment: () => void;
  onVerifyEnrollment: () => void;
  onDisable: (factorId: string) => void;
}) {
  const verifiedFactor = factors.find((factor) => factor.status === 'verified');

  return (
    <div className="space-y-5">
      <div>
        <h3 className="mb-1 flex items-center gap-2 font-semibold">
          <Shield className="h-4 w-4 text-violet-400" />
          Security
        </h3>
        <p className="text-muted-foreground text-sm">
          Two-step verification uses an authenticator app like Google Authenticator, Microsoft Authenticator, or
          1Password.
        </p>
      </div>

      <div className="border-border bg-card rounded-xl border p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-500/10">
              <Smartphone className="h-5 w-5 text-violet-400" />
            </div>
            <div>
              <p className="text-sm font-semibold">Authenticator app</p>
              <p className="text-muted-foreground mt-1 text-xs leading-5">
                {loading
                  ? 'Checking status...'
                  : verifiedFactor
                    ? 'Enabled. A 6-digit code from your authenticator app is required.'
                    : 'Not enabled. Scan the QR code to secure your account.'}
              </p>
            </div>
          </div>
          {verifiedFactor ? (
            <Button variant="outline" size="sm" loading={saving} onClick={() => onDisable(verifiedFactor.id)}>
              <Trash2 className="h-3.5 w-3.5" /> Disable
            </Button>
          ) : (
            <Button variant="gradient" size="sm" loading={saving || loading} onClick={onStartEnrollment}>
              <KeyRound className="h-3.5 w-3.5" /> Enable 2FA
            </Button>
          )}
        </div>
      </div>

      {enrollment && (
        <div className="space-y-4 rounded-xl border border-violet-500/25 bg-violet-500/10 p-4">
          <div>
            <p className="text-sm font-semibold">Scan QR code</p>
            <p className="text-muted-foreground mt-1 text-xs leading-5">
              Scan the QR code with your authenticator app, then verify the generated 6-digit code here.
            </p>
          </div>
          {enrollment.qrCode ? (
            <div className="inline-flex rounded-lg bg-white p-3">
              {/* Supabase returns a data URI SVG for this QR code. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={enrollment.qrCode} alt="Two-step verification QR code" className="h-44 w-44" />
            </div>
          ) : null}
          {enrollment.secret ? (
            <div className="border-border bg-background/60 rounded-lg border p-3">
              <p className="text-muted-foreground text-xs">Manual setup key</p>
              <p className="mt-1 font-mono text-xs break-all">{enrollment.secret}</p>
            </div>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={code}
              onChange={(event) => onCodeChange(event.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="6-digit code"
              className="font-mono tracking-widest"
            />
            <Button variant="gradient" loading={saving} onClick={onVerifyEnrollment}>
              Verify
            </Button>
          </div>
        </div>
      )}
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
