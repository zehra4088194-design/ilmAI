'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import { createClient } from '@/lib/supabase/client';
import { BOARDS } from '@/lib/constants';
import { toast } from 'sonner';
import { User, Bell, Shield, Palette, Users, Languages, GraduationCap } from 'lucide-react';
import { ParentMessageThread } from '@/components/ui/ParentMessageThread';
import { RoutineTestsWidget } from '@/components/ui/RoutineTestsWidget';
import { useTranslations, useLocale } from '@/providers/I18nProvider';
import { LOCALES, LOCALE_LABELS, type Locale } from '@/lib/i18n/config';
import { ClassSettingsCard } from '@/components/features/settings/ClassSettingsCard';
import {
  CLASS_SELECTION_GRADE_LEVELS,
  type GradeLevel,
  type ClassSelectionGradeLevel,
} from '@/lib/supabase/getUserGradeLevel';
import { EDUCATION_LEVELS, OUTPUT_STYLES, type EducationLevel, type PreferredOutputStyle } from '@/lib/constants/university';

export function SettingsTabs({ profile, currentGradeLevel }: { profile: any; currentGradeLevel: GradeLevel | null }) {
  const [activeTab, setActiveTab] = useState('profile');
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [board, setBoard] = useState(profile?.board || '');
  const [educationLevel, setEducationLevel] = useState<EducationLevel>(profile?.education_level || 'school');
  const [program, setProgram] = useState(profile?.university_program || '');
  const [semester, setSemester] = useState(profile?.university_semester || '');
  const [courses, setCourses] = useState((profile?.university_courses || []).join(', '));
  const [examTargetDate, setExamTargetDate] = useState(profile?.university_exam_target_date || '');
  const [preferredOutputStyle, setPreferredOutputStyle] = useState<PreferredOutputStyle>(profile?.preferred_output_style || 'simple');
  const [saving, setSaving] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [linking, setLinking] = useState(false);
  const [approvedLink, setApprovedLink] = useState<{ id: string; parent_id: string } | null>(null);
  const [loadingLink, setLoadingLink] = useState(true);
  const supabase = createClient();
  const t = useTranslations();
  const { locale, setLocale } = useLocale();
  const classSettingsGrade =
    currentGradeLevel && CLASS_SELECTION_GRADE_LEVELS.includes(currentGradeLevel as ClassSelectionGradeLevel)
      ? (currentGradeLevel as ClassSelectionGradeLevel)
      : null;

  const TABS = [
    { id: 'profile', label: t('settings.tabs.profile'), icon: User },
    { id: 'university', label: 'University Mode', icon: GraduationCap },
    { id: 'parent-link', label: t('settings.tabs.parentLink'), icon: Users },
    { id: 'notifications', label: t('settings.tabs.notifications'), icon: Bell },
    { id: 'security', label: t('settings.tabs.security'), icon: Shield },
    { id: 'appearance', label: t('settings.tabs.appearance'), icon: Palette },
    { id: 'language', label: t('settings.tabs.language'), icon: Languages },
  ];

  // Check if this student already has an approved parent link — if so, show
  // the live chat + routine tests instead of the "enter invite code" form.
  useEffect(() => {
    if (!profile?.id) return;
    supabase
      .from('parent_student_links')
      .select('id, parent_id')
      .eq('student_id', profile.id)
      .eq('status', 'approved')
      .maybeSingle()
      .then(({ data }) => {
        setApprovedLink(data);
        setLoadingLink(false);
      });
  }, [profile?.id, supabase]);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      full_name: fullName,
      board,
      education_level: educationLevel,
      updated_at: new Date().toISOString(),
    }).eq('id', profile.id);
    if (error) toast.error(error.message); else toast.success('Profile update ho gaya!');
    setSaving(false);
  };

  const handleUniversitySave = async () => {
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      education_level: educationLevel,
      university_program: program.trim() || null,
      university_semester: semester.trim() || null,
      university_courses: courses.split(',').map((course: string) => course.trim()).filter(Boolean).slice(0, 12),
      university_exam_target_date: examTargetDate || null,
      preferred_output_style: preferredOutputStyle,
      is_profile_complete: educationLevel === 'university' && program.trim() && semester.trim() ? true : profile?.is_profile_complete,
      onboarding_completed: educationLevel === 'university' && program.trim() && semester.trim() ? true : profile?.onboarding_completed,
      updated_at: new Date().toISOString(),
    }).eq('id', profile.id);
    if (error) toast.error(error.message); else toast.success('University settings save ho gayi!');
    setSaving(false);
  };

  const handleLinkParent = async () => {
    if (!inviteCode.trim()) { toast.error('Invite code likho'); return; }
    setLinking(true);
    try {
      const res = await fetch('/api/parent/accept-invite', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: inviteCode.trim() }),
      });
      const json = await res.json();
      if (json.status === 'error') { toast.error(json.error); return; }
      toast.success(json.message);
      setInviteCode('');
      // Refresh link status so chat/routine widgets appear immediately
      const { data } = await supabase.from('parent_student_links').select('id, parent_id').eq('student_id', profile.id).eq('status', 'approved').maybeSingle();
      setApprovedLink(data);
    } catch { toast.error('Kuch ghalat ho gaya'); }
    finally { setLinking(false); }
  };

  return (
    <div className="grid md:grid-cols-[200px_1fr] gap-6">
      <div className="space-y-1">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={cn('w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors', activeTab === tab.id ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent/50')}>
            <tab.icon className="w-4 h-4" />{tab.label}
          </button>
        ))}
      </div>
      <Card>
        <CardContent className="p-6">
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div><label className="text-sm font-medium mb-1.5 block">Full Name</label><Input value={fullName} onChange={e => setFullName(e.target.value)} /></div>
              <div><label className="text-sm font-medium mb-1.5 block">Board</label>
                <select value={board} onChange={e => setBoard(e.target.value)} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm">
                  <option value="">Select board</option>
                  {BOARDS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                </select>
              </div>
              <Button variant="gradient" onClick={handleSave} loading={saving}>Save Changes</Button>
              {classSettingsGrade && <ClassSettingsCard currentGradeLevel={classSettingsGrade} />}
            </div>
          )}
          {activeTab === 'university' && (
            <div className="space-y-5">
              <div>
                <h3 className="font-semibold mb-1 flex items-center gap-2"><GraduationCap className="w-4 h-4 text-violet-400" />Education Level</h3>
                <p className="text-sm text-muted-foreground">University Mode select karne se dashboard assignment, essay, presentation, viva aur semester tools show karega.</p>
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                {EDUCATION_LEVELS.map((level) => (
                  <button
                    key={level.value}
                    onClick={() => setEducationLevel(level.value)}
                    className={cn('rounded-xl border p-3 text-left transition-colors', educationLevel === level.value ? 'border-violet-500 bg-violet-500/10' : 'border-border hover:border-violet-500/30')}
                  >
                    <span className="block text-sm font-semibold">{level.label}</span>
                    <span className="text-xs text-muted-foreground">{level.description}</span>
                  </button>
                ))}
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div><label className="text-sm font-medium mb-1.5 block">Degree / Program</label><Input value={program} onChange={e => setProgram(e.target.value)} placeholder="BS Computer Science" /></div>
                <div><label className="text-sm font-medium mb-1.5 block">Semester</label><Input value={semester} onChange={e => setSemester(e.target.value)} placeholder="Semester 5" /></div>
                <div className="sm:col-span-2"><label className="text-sm font-medium mb-1.5 block">Subjects / Courses</label><Input value={courses} onChange={e => setCourses(e.target.value)} placeholder="AI, Software Engineering, Statistics" /></div>
                <div><label className="text-sm font-medium mb-1.5 block">Exam target date</label><Input type="date" value={examTargetDate} onChange={e => setExamTargetDate(e.target.value)} /></div>
                <div><label className="text-sm font-medium mb-1.5 block">Preferred output style</label>
                  <select value={preferredOutputStyle} onChange={e => setPreferredOutputStyle(e.target.value as PreferredOutputStyle)} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm">
                    {OUTPUT_STYLES.map(style => <option key={style.value} value={style.value}>{style.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-300">
                Use AI output as a study draft. Review, personalize, and verify before submission.
              </div>
              <Button variant="gradient" onClick={handleUniversitySave} loading={saving}>Save University Mode</Button>
            </div>
          )}
          {activeTab === 'parent-link' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-1 flex items-center gap-2"><Users className="w-4 h-4 text-violet-400" />Parent Se Link Karo</h3>
                <p className="text-sm text-muted-foreground mb-4">Apne parent se invite code lo aur yahan enter karo — wo tumhari progress dekh sakenge.</p>
              </div>
              {loadingLink ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : approvedLink ? (
                <div className="space-y-4">
                  <div className="text-sm text-green-500 bg-green-500/10 rounded-lg px-3 py-2">
                    ✅ Aap apne parent se linked ho — wo aapki progress dekh sakte hain.
                  </div>
                  <ParentMessageThread linkId={approvedLink.id} currentUserId={profile.id} />
                  <RoutineTestsWidget studentId={profile.id} />
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    <Input value={inviteCode} onChange={e => setInviteCode(e.target.value.toUpperCase())} placeholder="e.g. SV-A1B2C3" className="font-mono" />
                    <Button variant="gradient" onClick={handleLinkParent} loading={linking}>Link Karo</Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Parent apne dashboard se &ldquo;Generate Invite Code&rdquo; pe click kar ke ye code bana sakte hain.</p>
                </>
              )}
            </div>
          )}
          {activeTab === 'notifications' && <p className="text-sm text-muted-foreground">Notification preferences jald aayengi.</p>}
          {activeTab === 'security' && <p className="text-sm text-muted-foreground">Password change aur 2FA settings jald aayengi.</p>}
          {activeTab === 'appearance' && <p className="text-sm text-muted-foreground">Theme settings navbar mein available hain (sun/moon/system icon).</p>}
          {activeTab === 'language' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-1 flex items-center gap-2"><Languages className="w-4 h-4 text-violet-400" />{t('settings.language.title')}</h3>
                <p className="text-sm text-muted-foreground mb-4">{t('settings.language.description')}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {LOCALES.map((value: Locale) => (
                  <button
                    key={value}
                    onClick={() => { setLocale(value); toast.success(t('settings.language.saved')); }}
                    className={cn(
                      'flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all text-sm font-medium',
                      locale === value ? 'border-violet-500 bg-violet-500/10 text-foreground' : 'border-border hover:border-violet-500/30 text-muted-foreground'
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
