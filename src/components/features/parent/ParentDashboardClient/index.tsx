'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import QRCode from 'react-qr-code';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  AlertCircle,
  BookOpen,
  Clock,
  Copy,
  Flame,
  Link as LinkIcon,
  LockKeyhole,
  Plus,
  QrCode,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils/cn';
import { formatDuration, formatXP } from '@/lib/utils/format';
import { toast } from 'sonner';
import { RoutineTestsWidget } from '@/components/ui/RoutineTestsWidget';
import { ParentMessageThread } from '@/components/ui/ParentMessageThread';
import { ParentAttachments } from '@/components/ui/ParentAttachments';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface ParentDashboardClientProps {
  links: any[];
  snapshots: any[];
  parentId: string;
  initialLinkId?: string;
  initialView?: 'chat' | 'files';
}

export function ParentDashboardClient({
  links,
  snapshots,
  parentId,
  initialLinkId,
  initialView,
}: ParentDashboardClientProps) {
  const approvedLinks = links.filter((link) => link.status === 'approved' && link.student);
  const dashboardLinks = approvedLinks.filter((link) => link.student?.parent_entitlement?.dashboard);
  const pendingLinks = links.filter((link) => link.status === 'pending');
  const [showLinkForm, setShowLinkForm] = useState(approvedLinks.length === 0);
  const [inviteCode, setInviteCode] = useState(pendingLinks[0]?.invite_code || '');
  const [creating, setCreating] = useState(false);
  const [origin, setOrigin] = useState('');
  const router = useRouter();
  const supabase = createClient();
  const inviteUrl = inviteCode && origin ? `${origin}/parent-link?code=${encodeURIComponent(inviteCode)}` : '';

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel(`parent_links:${parentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'parent_student_links',
          filter: `parent_id=eq.${parentId}`,
        },
        () => router.refresh()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [parentId, router, supabase]);

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
      toast.error('The code could not be generated.');
    } finally {
      setCreating(false);
    }
  };

  const copyCode = async () => {
    await navigator.clipboard.writeText(inviteCode);
    toast.success('Code copy ho gaya');
  };

  const copyLink = async () => {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    toast.success('QR link copy ho gaya');
  };

  const getStudentSnapshots = (studentId: string) =>
    snapshots.filter((snapshot) => snapshot.student_id === studentId).slice(0, 4);

  if (approvedLinks.length === 0) {
    return (
      <div className="space-y-6">
        <Card className="border-violet-500/30 bg-violet-500/5">
          <CardContent className="p-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
              <LockKeyhole className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold">Parent dashboard is locked</h2>
            <p className="text-muted-foreground mx-auto mt-2 max-w-xl text-sm">
              Generate a parent code first. The dashboard will open after at least one student accepts this code in
              their account, showing progress, chat, and schedules.
            </p>
            <div className="mx-auto mt-5 max-w-md">
              <InviteBox
                inviteCode={inviteCode}
                inviteUrl={inviteUrl}
                creating={creating}
                generateInvite={generateInvite}
                copyCode={copyCode}
                copyLink={copyLink}
              />
            </div>
          </CardContent>
        </Card>

        {pendingLinks.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertCircle className="h-4 w-4 text-amber-500" /> Waiting for student
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {pendingLinks.map((link) => (
                <div key={link.id} className="bg-muted/30 rounded-lg p-3 text-sm">
                  <p className="font-mono font-semibold tracking-wider">{link.invite_code || 'Code generated'}</p>
                  <p className="text-muted-foreground text-xs">
                    The student should enter this code under Settings &gt; Parent Link.
                  </p>
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
      {dashboardLinks.length < approvedLinks.length && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">Parent Link is connected on the Free plan</p>
              <p className="text-muted-foreground mt-1 text-sm">
                Live progress, reports, chat, and files unlock with the student&apos;s Pro or Elite plan. QR/link setup
                will remain connected.
              </p>
            </div>
            <Button asChild variant="gradient" className="shrink-0">
              <Link href="/subscription">View plans</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard icon={Users} label="Linked Students" value={approvedLinks.length} tone="text-violet-400" />
        <StatCard
          icon={TrendingUp}
          label="Avg XP"
          value={
            dashboardLinks.length
              ? Math.round(
                  dashboardLinks.reduce((sum, link) => sum + ((link.student as any)?.xp || 0), 0) /
                    dashboardLinks.length
                )
              : '-'
          }
          tone="text-green-400"
        />
        <StatCard
          icon={Flame}
          label="Best Streak"
          value={Math.max(...dashboardLinks.map((link) => (link.student as any)?.streak || 0), 0)}
          tone="text-orange-400"
        />
        <StatCard
          icon={Clock}
          label="Total Study Time"
          value={
            dashboardLinks.length
              ? `${dashboardLinks.reduce((sum, link) => sum + Math.round(((link.student as any)?.total_study_time || 0) / 60), 0)}h`
              : '-'
          }
          tone="text-blue-400"
        />
      </div>

      <Card>
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 font-semibold">
                <Plus className="h-4 w-4 text-violet-400" /> Add another student
              </h3>
              <p className="text-muted-foreground mt-1 text-xs">Generate a new parent code and share it with the student.</p>
            </div>
            <Button variant="gradient" onClick={() => setShowLinkForm((value) => !value)} size="sm">
              <QrCode className="h-4 w-4" /> Generate Code
            </Button>
          </div>
          {showLinkForm && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 max-w-md">
              <InviteBox
                inviteCode={inviteCode}
                inviteUrl={inviteUrl}
                creating={creating}
                generateInvite={generateInvite}
                copyCode={copyCode}
                copyLink={copyLink}
              />
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
          const chartData = [...studentSnaps].reverse().map((snapshot) => ({
            week: new Date(`${snapshot.week_start}T00:00:00`).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            }),
            xp: Number(snapshot.xp_earned) || 0,
            score: Number(snapshot.average_score) || 0,
            study: Number(snapshot.study_minutes) || 0,
          }));

          if (!student.parent_entitlement?.dashboard) {
            return (
              <motion.div
                key={link.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="h-full border-dashed">
                  <CardContent className="space-y-4 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-lg font-bold text-white">
                          {student.full_name?.[0]?.toUpperCase() || 'S'}
                        </div>
                        <div>
                          <h3 className="font-bold">{student.full_name}</h3>
                          <p className="text-muted-foreground text-xs">Parent link connected</p>
                        </div>
                      </div>
                      <Badge variant="outline">FREE</Badge>
                    </div>

                    <div className="relative grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {['Weekly XP', 'Quiz average', 'Study time', 'Accuracy', 'Streak', 'AI activity'].map((label) => (
                        <div key={label} className="bg-muted/35 rounded-xl border p-3">
                          <LockKeyhole className="text-muted-foreground mb-2 h-4 w-4" />
                          <p className="text-lg font-bold blur-sm select-none">88%</p>
                          <p className="text-muted-foreground text-[10px]">{label}</p>
                        </div>
                      ))}
                    </div>

                    <div className="relative flex h-36 items-end gap-2 overflow-hidden rounded-xl border bg-gradient-to-b from-violet-500/5 to-violet-500/15 p-4">
                      {[34, 62, 48, 78, 58, 88, 72].map((height, chartIndex) => (
                        <span
                          key={chartIndex}
                          className="flex-1 rounded-t bg-violet-500/35 blur-[1px]"
                          style={{ height: `${height}%` }}
                        />
                      ))}
                      <span className="bg-background/85 absolute inset-0 flex flex-col items-center justify-center text-center backdrop-blur-[2px]">
                        <LockKeyhole className="mb-2 h-5 w-5 text-violet-500" />
                        <span className="text-sm font-semibold">Weekly learning graph locked</span>
                        <span className="text-muted-foreground mt-1 text-xs">Unlock live indicators with Pro or Elite</span>
                      </span>
                    </div>

                    <Button asChild variant="gradient" className="w-full">
                      <Link href="/subscription">Unlock parent dashboard</Link>
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          }

          return (
            <motion.div
              key={link.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="h-full">
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-lg font-bold text-white">
                        {student.full_name?.[0]?.toUpperCase() || 'S'}
                      </div>
                      <div>
                        <h3 className="font-bold">{student.full_name}</h3>
                        <p className="text-muted-foreground text-xs">
                          {student.board && `${student.board} | `}
                          {student.grade_level?.replace('GRADE_', 'Grade ').replace('_', '-') || 'Grade not set'}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={student.subscription_tier === 'FREE' ? 'outline' : 'default'}
                      className={cn(student.subscription_tier !== 'FREE' && 'bg-violet-600')}
                    >
                      {student.subscription_tier}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <MiniStat label="XP" value={formatXP(student.xp)} tone="text-violet-400" />
                    <MiniStat label="Level" value={`Level ${student.level}`} tone="text-blue-400" />
                    <MiniStat label="Study" value={formatDuration(student.total_study_time)} tone="text-green-400" />
                    <MiniStat
                      label="Trend"
                      value={`${xpTrend >= 0 ? '+' : ''}${xpTrend} XP`}
                      tone={xpTrend >= 0 ? 'text-green-400' : 'text-red-400'}
                    />
                  </div>

                  <div className="border-border/70 rounded-xl border p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">Weekly learning graph</p>
                        <p className="text-muted-foreground text-[11px]">XP and average quiz score</p>
                      </div>
                      <Badge variant="outline">{chartData.length || 0} weeks</Badge>
                    </div>
                    {chartData.length ? (
                      <div className="h-48 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                            <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                            <Line type="monotone" dataKey="xp" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 3 }} />
                            <Line type="monotone" dataKey="score" stroke="#22c55e" strokeWidth={2} dot={{ r: 2 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="text-muted-foreground flex h-28 items-center justify-center text-xs">
                      The graph will appear here after the first weekly snapshot is created.
                      </div>
                    )}
                  </div>

                  {studentSnaps.length > 0 && (
                    <div>
                      <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
                        Last 4 Weeks
                      </p>
                      <div className="grid grid-cols-4 gap-2">
                        {[...Array(4)].map((_, weekIndex) => {
                          const snap = studentSnaps[3 - weekIndex];
                          return (
                            <div
                              key={weekIndex}
                              className={cn(
                                'rounded-lg p-2 text-center text-xs',
                                snap ? 'border border-violet-500/20 bg-violet-500/10' : 'bg-muted/20'
                              )}
                            >
                              <p className="text-sm font-bold">{snap ? snap.xp_earned : '-'}</p>
                              <p className="text-muted-foreground text-[10px]">XP</p>
                              {snap && (
                                <p className="text-muted-foreground text-[10px]">{snap.quizzes_completed} quizzes</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {lastWeek && (
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <InfoPill icon={BookOpen} label="Quizzes" value={lastWeek.quizzes_completed} />
                      <InfoPill
                        icon={TrendingUp}
                        label="Avg Score"
                        value={`${lastWeek.average_score?.toFixed(0) || 0}%`}
                      />
                      <InfoPill icon={Zap} label="AI Msgs" value={lastWeek.ai_messages_sent} />
                    </div>
                  )}

                  {!student.is_profile_complete && (
                    <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-500">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      The student&apos;s profile is incomplete. Board and grade still need to be set.
                    </div>
                  )}

                  <RoutineTestsWidget studentId={student.id} />

                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant="gradient" size="sm">
                      <Link href={`/parent/analytics?studentId=${encodeURIComponent(student.id)}`}>
                        <TrendingUp className="h-3.5 w-3.5" />
                        {student.parent_entitlement?.advancedAnalytics ? 'Detailed analytics' : 'Progress details'}
                      </Link>
                    </Button>
                    <ParentMessageThread
                      linkId={link.id}
                      currentUserId={parentId}
                      autoOpen={initialLinkId === link.id && initialView === 'chat'}
                    />
                    <ParentAttachments
                      linkId={link.id}
                      currentUserId={parentId}
                      autoOpen={initialLinkId === link.id && initialView === 'files'}
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function InviteBox({
  inviteCode,
  inviteUrl,
  creating,
  generateInvite,
  copyCode,
  copyLink,
}: {
  inviteCode: string;
  inviteUrl: string;
  creating: boolean;
  generateInvite: () => void;
  copyCode: () => void;
  copyLink: () => void;
}) {
  if (!inviteCode) {
    return (
      <Button variant="gradient" onClick={generateInvite} loading={creating} className="w-full">
        <QrCode className="h-4 w-4" /> Generate Parent Code
      </Button>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-xs">
        Ask the student to scan the QR code or share this code/link. After the QR is read, the student will press
        &ldquo;Press to connect&rdquo; to approve the parent link.
      </p>
      {inviteUrl && (
        <div className="rounded-xl border bg-white p-4 text-center">
          <QRCode
            value={inviteUrl}
            size={224}
            level="M"
            bgColor="#ffffff"
            fgColor="#000000"
            className="mx-auto h-auto max-w-full"
          />
        </div>
      )}
      <div className="flex gap-2">
        <Input value={inviteCode} readOnly className="text-center font-mono text-lg tracking-widest" />
        <Button variant="outline" onClick={copyCode}>
          <Copy className="h-4 w-4" />
        </Button>
      </div>
      <Button variant="outline" size="sm" onClick={copyLink} disabled={!inviteUrl} className="w-full">
        <LinkIcon className="h-4 w-4" /> Copy Scan Link
      </Button>
      <p className="text-xs text-amber-500">This code expires after 24 hours.</p>
      <Button variant="ghost" size="sm" onClick={generateInvite} loading={creating}>
        New Code
      </Button>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: any;
  label: string;
  value: string | number;
  tone: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <Icon className={cn('mb-2 h-5 w-5', tone)} />
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-muted-foreground text-xs">{label}</p>
      </CardContent>
    </Card>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string | number; tone: string }) {
  return (
    <div className="bg-muted/30 rounded-xl p-3 text-center">
      <p className={cn('text-xl font-bold', tone)}>{value}</p>
      <p className="text-muted-foreground text-[10px]">{label}</p>
    </div>
  );
}

function InfoPill({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) {
  return (
    <div className="bg-muted/20 flex items-center gap-2 rounded-lg p-2">
      <Icon className="h-3.5 w-3.5 shrink-0 text-violet-400" />
      <div>
        <p className="font-medium">{value}</p>
        <p className="text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
