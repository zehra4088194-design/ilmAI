'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, BookOpen, Clock, Copy, Crown, Flame, LockKeyhole, Plus, QrCode, TrendingUp, Users, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils/cn';
import { formatDuration, formatXP } from '@/lib/utils/format';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/auth/useAuth';
import { RoutineTestsWidget } from '@/components/ui/RoutineTestsWidget';
import { ParentMessageThread } from '@/components/ui/ParentMessageThread';
import { ParentAttachments } from '@/components/ui/ParentAttachments';
import Link from 'next/link';

interface ParentDashboardClientProps {
  links: any[];
  snapshots: any[];
  parentId: string;
}

export function ParentDashboardClient({ links, snapshots, parentId }: ParentDashboardClientProps) {
  const { user } = useAuth();
  const approvedLinks = links.filter((link) => link.status === 'approved' && link.student);
  const pendingLinks = links.filter((link) => link.status === 'pending');
  const [showLinkForm, setShowLinkForm] = useState(approvedLinks.length === 0);
  const [inviteCode, setInviteCode] = useState(pendingLinks[0]?.invite_code || '');
  const [creating, setCreating] = useState(false);

  const generateInvite = async () => {
    setCreating(true);
    try {
      const res = await fetch('/api/parent/generate-invite', { method: 'POST' });
      const json = await res.json();
      if (json.status === 'error') {
        toast.error(json.error);
        return;
      }
      setInviteCode(json.data.code);
      toast.success('Parent code ban gaya');
    } catch {
      toast.error('Code generate nahi hua');
    } finally {
      setCreating(false);
    }
  };

  const copyCode = async () => {
    await navigator.clipboard.writeText(inviteCode);
    toast.success('Code copy ho gaya');
  };

  const getStudentSnapshots = (studentId: string) =>
    snapshots.filter((snapshot) => snapshot.student_id === studentId).slice(0, 4);
  const parentTier = user?.subscriptionTier || 'FREE';
  const isFreeParent = parentTier === 'FREE';
  const isEliteParent = parentTier === 'ELITE';

  if (approvedLinks.length === 0) {
    return (
      <div className="space-y-6">
        <Card className="border-violet-500/30 bg-violet-500/5">
          <CardContent className="p-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
              <LockKeyhole className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold">Parent dashboard locked hai</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
              Pehle parent code generate karo. Jab kam az kam ek student apne account mein ye code accept karega, tab parent dashboard progress, chat aur schedules ke saath open hoga.
            </p>
            <div className="mx-auto mt-5 max-w-md">
              <InviteBox inviteCode={inviteCode} creating={creating} generateInvite={generateInvite} copyCode={copyCode} />
            </div>
          </CardContent>
        </Card>

        {pendingLinks.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500" /> Waiting for student
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {pendingLinks.map((link) => (
                <div key={link.id} className="rounded-lg bg-muted/30 p-3 text-sm">
                  <p className="font-mono font-semibold tracking-wider">{link.invite_code || 'Code generated'}</p>
                  <p className="text-xs text-muted-foreground">Student Settings &gt; Parent Link mein ye code enter karega.</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ParentUpgradeBanner isFree={isFreeParent} />
      <ParentEliteBanner tier={parentTier} />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard icon={Users} label="Linked Students" value={approvedLinks.length} tone="text-violet-400" />
        {isFreeParent ? (
          <>
            <LockedStat label="Avg XP" />
            <LockedStat label="Best Streak" />
            <LockedStat label="Total Study Time" />
          </>
        ) : (
          <>
            <StatCard
              icon={TrendingUp}
              label="Avg XP"
              value={Math.round(approvedLinks.reduce((sum, link) => sum + ((link.student as any)?.xp || 0), 0) / approvedLinks.length)}
              tone="text-green-400"
            />
            <StatCard icon={Flame} label="Best Streak" value={Math.max(...approvedLinks.map((link) => (link.student as any)?.streak || 0), 0)} tone="text-orange-400" />
            <StatCard icon={Clock} label="Total Study Time" value={`${approvedLinks.reduce((sum, link) => sum + Math.round(((link.student as any)?.total_study_time || 0) / 60), 0)}h`} tone="text-blue-400" />
          </>
        )}
      </div>

      <Card>
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold flex items-center gap-2"><Plus className="h-4 w-4 text-violet-400" /> Add another student</h3>
              <p className="mt-1 text-xs text-muted-foreground">New parent code generate karo aur student ko do.</p>
            </div>
            <Button variant="gradient" onClick={() => setShowLinkForm((value) => !value)} size="sm">
              <QrCode className="h-4 w-4" /> Generate Code
            </Button>
          </div>
          {showLinkForm && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 max-w-md">
              <InviteBox inviteCode={inviteCode} creating={creating} generateInvite={generateInvite} copyCode={copyCode} />
            </motion.div>
          )}
        </CardContent>
      </Card>

      <div className={cn('grid gap-6', approvedLinks.length > 1 ? 'xl:grid-cols-2' : 'grid-cols-1')}>
        {approvedLinks.map((link, index) => {
          const student = link.student as any;
          const studentSnaps = getStudentSnapshots(student.id);
          const lastWeek = studentSnaps[0];
          const weekBefore = studentSnaps[1];
          const xpTrend = lastWeek && weekBefore ? lastWeek.xp_earned - weekBefore.xp_earned : 0;

          return (
            <motion.div key={link.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
              <Card className="h-full">
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-lg font-bold text-white">
                        {student.full_name?.[0]?.toUpperCase() || 'S'}
                      </div>
                      <div>
                        <h3 className="font-bold">{student.full_name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {student.board && `${student.board} | `}{student.grade_level?.replace('GRADE_', 'Grade ').replace('_', '-') || 'Grade not set'}
                        </p>
                      </div>
                    </div>
                    <Badge variant={student.subscription_tier === 'FREE' ? 'outline' : 'default'} className={cn(student.subscription_tier !== 'FREE' && 'bg-violet-600')}>
                      {student.subscription_tier}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <MiniStat label="XP" value={formatXP(student.xp)} tone="text-violet-400" />
                    <MiniStat label="Level" value={`Level ${student.level}`} tone="text-blue-400" />
                    {isFreeParent ? (
                      <>
                        <LockedMiniStat label="Study" />
                        <LockedMiniStat label="Trend" />
                      </>
                    ) : (
                      <>
                        <MiniStat label="Study" value={formatDuration(student.total_study_time)} tone="text-green-400" />
                        <MiniStat label="Trend" value={`${xpTrend >= 0 ? '+' : ''}${xpTrend} XP`} tone={xpTrend >= 0 ? 'text-green-400' : 'text-red-400'} />
                      </>
                    )}
                  </div>

                  {studentSnaps.length > 0 && !isFreeParent && (
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Last 4 Weeks</p>
                      <div className="grid grid-cols-4 gap-2">
                        {[...Array(4)].map((_, weekIndex) => {
                          const snap = studentSnaps[3 - weekIndex];
                          return (
                            <div key={weekIndex} className={cn('rounded-lg p-2 text-center text-xs', snap ? 'border border-violet-500/20 bg-violet-500/10' : 'bg-muted/20')}>
                              <p className="text-sm font-bold">{snap ? snap.xp_earned : '-'}</p>
                              <p className="text-[10px] text-muted-foreground">XP</p>
                              {snap && <p className="text-[10px] text-muted-foreground">{snap.quizzes_completed} quizzes</p>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {lastWeek && !isFreeParent && (
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <InfoPill icon={BookOpen} label="Quizzes" value={lastWeek.quizzes_completed} />
                      <InfoPill icon={TrendingUp} label="Avg Score" value={`${lastWeek.average_score?.toFixed(0) || 0}%`} />
                      <InfoPill icon={Zap} label="AI Msgs" value={lastWeek.ai_messages_sent} />
                    </div>
                  )}

                  {!student.is_profile_complete && (
                    <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-500">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      Student ka profile complete nahi. Board aur grade set karna baqi hai.
                    </div>
                  )}

                  {isFreeParent ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      <LockedFeature title="Weekly progress history" description="4-week XP, quizzes, average score and study-time trends Pro mein unlock honge." />
                      <LockedFeature title="Routine test scheduling" description="Parent student ko tests aur reminders schedule kar sakega." />
                      <LockedFeature title="Live parent-student chat" description="Realtime chat aur notifications Pro members ke liye hain." />
                      <LockedFeature title="Attachments & reports" description="Notes, progress reports aur files share karne ke liye upgrade karo." />
                    </div>
                  ) : (
                    <>
                      <RoutineTestsWidget studentId={student.id} />

                      <div className="flex flex-wrap gap-2">
                        <ParentMessageThread linkId={link.id} currentUserId={parentId} />
                        <ParentAttachments linkId={link.id} currentUserId={parentId} />
                      </div>

                      {!isEliteParent && (
                        <div className="grid gap-3 md:grid-cols-2">
                          <LockedFeature tier="Elite" title="AI risk alerts" description="Elite mein low activity, weak subject aur streak-break risk alerts parent ko milenge." />
                          <LockedFeature tier="Elite" title="Multi-student comparison" description="Elite parent dashboard siblings/children ki side-by-side comparison insights dikhayega." />
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function InviteBox({ inviteCode, creating, generateInvite, copyCode }: { inviteCode: string; creating: boolean; generateInvite: () => void; copyCode: () => void }) {
  if (!inviteCode) {
    return (
      <Button variant="gradient" onClick={generateInvite} loading={creating} className="w-full">
        <QrCode className="h-4 w-4" /> Generate Parent Code
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Ye code student ko do. Student Settings mein Parent Link mein enter karega:</p>
      <div className="flex gap-2">
        <Input value={inviteCode} readOnly className="text-center font-mono text-lg tracking-widest" />
        <Button variant="outline" onClick={copyCode}><Copy className="h-4 w-4" /></Button>
      </div>
      <p className="text-xs text-amber-500">Ye code 24 ghante mein expire ho jata hai.</p>
      <Button variant="ghost" size="sm" onClick={generateInvite} loading={creating}>New Code</Button>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string | number; tone: string }) {
  return (
    <Card><CardContent className="p-4">
      <Icon className={cn('mb-2 h-5 w-5', tone)} />
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </CardContent></Card>
  );
}

function ParentUpgradeBanner({ isFree }: { isFree: boolean }) {
  if (!isFree) return null;
  return (
    <Card className="border-violet-500/30 bg-gradient-to-r from-violet-500/12 via-background to-indigo-500/10">
      <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white">
            <Crown className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-bold">FREE parent plan: 2/10 features unlocked</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Free mein student link + basic XP/level overview milta hai. Pro se live chat, weekly reports, schedules, study time, trends, attachments aur alerts unlock honge.
            </p>
          </div>
        </div>
        <Button asChild variant="gradient" className="shrink-0">
          <Link href="/subscription">Pro to unlock features</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function ParentEliteBanner({ tier }: { tier: string }) {
  if (tier !== 'PRO') return null;
  return (
    <Card className="border-amber-500/30 bg-gradient-to-r from-amber-500/12 via-background to-orange-500/10">
      <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white">
            <Crown className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-bold">Elite parent insights locked</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Pro mein reports/chat/schedules milte hain. Elite se AI risk alerts, multi-student comparison, priority insights aur Live Voice Call unlock hota hai.
            </p>
          </div>
        </div>
        <Button asChild variant="outline" className="shrink-0 border-amber-500/40 text-amber-500 hover:bg-amber-500/10">
          <Link href="/subscription">Upgrade to Elite</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function LockedStat({ label }: { label: string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="p-4">
        <LockKeyhole className="mb-2 h-5 w-5 text-violet-400" />
        <p className="text-lg font-bold blur-[2px] select-none">999</p>
        <p className="text-xs text-muted-foreground">{label}</p>
        <Link href="/subscription" className="mt-2 inline-flex text-[11px] font-semibold text-violet-400 hover:underline">Unlock Pro</Link>
      </CardContent>
    </Card>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string | number; tone: string }) {
  return (
    <div className="rounded-xl bg-muted/30 p-3 text-center">
      <p className={cn('text-xl font-bold', tone)}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function LockedMiniStat({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-dashed bg-muted/20 p-3 text-center">
      <LockKeyhole className="mx-auto mb-1 h-4 w-4 text-violet-400" />
      <p className="text-xs font-semibold text-violet-400">Pro</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function LockedFeature({ title, description, tier = 'Pro' }: { title: string; description: string; tier?: 'Pro' | 'Elite' }) {
  const elite = tier === 'Elite';
  return (
    <div className="rounded-xl border border-dashed bg-muted/20 p-4">
      <div className="mb-2 flex items-center gap-2">
        <LockKeyhole className={cn('h-4 w-4', elite ? 'text-amber-400' : 'text-violet-400')} />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <p className="text-xs leading-5 text-muted-foreground">{description}</p>
      <Button asChild variant="outline" size="sm" className={cn('mt-3 w-full', elite && 'border-amber-500/40 text-amber-500 hover:bg-amber-500/10')}>
        <Link href="/subscription">{tier} to unlock features</Link>
      </Button>
    </div>
  );
}

function InfoPill({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-muted/20 p-2">
      <Icon className="h-3.5 w-3.5 shrink-0 text-violet-400" />
      <div><p className="font-medium">{value}</p><p className="text-muted-foreground">{label}</p></div>
    </div>
  );
}