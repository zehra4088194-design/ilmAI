'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Users, TrendingUp, Clock, Zap, Flame, BookOpen, CheckCircle2, AlertCircle, QrCode, Copy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils/cn';
import { formatDuration, formatXP, formatRelativeTime } from '@/lib/utils/format';
import { toast } from 'sonner';

interface ParentDashboardClientProps {
  links: any[];
  snapshots: any[];
  parentId: string;
}

export function ParentDashboardClient({ links, snapshots, parentId }: ParentDashboardClientProps) {
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [creating, setCreating] = useState(false);

  const approvedLinks = links.filter(l => l.status === 'approved');
  const pendingLinks = links.filter(l => l.status === 'pending');

  const generateInvite = async () => {
    setCreating(true);
    try {
      const res = await fetch('/api/parent/generate-invite', { method: 'POST' });
      const json = await res.json();
      if (json.status === 'error') { toast.error(json.error); return; }
      setInviteCode(json.data.code);
      toast.success('Invite code ban gaya!');
    } catch { toast.error('Kuch ghalat ho gaya'); }
    finally { setCreating(false); }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(inviteCode);
    toast.success('Code copy ho gaya!');
  };

  const getStudentSnapshots = (studentId: string) =>
    snapshots.filter(s => s.student_id === studentId).slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4">
          <Users className="w-5 h-5 text-violet-400 mb-2" />
          <p className="text-2xl font-bold">{approvedLinks.length}</p>
          <p className="text-xs text-muted-foreground">Linked Students</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <TrendingUp className="w-5 h-5 text-green-400 mb-2" />
          <p className="text-2xl font-bold">
            {approvedLinks.length > 0
              ? Math.round(approvedLinks.reduce((sum, l) => sum + ((l.student as any)?.xp || 0), 0) / approvedLinks.length)
              : 0}
          </p>
          <p className="text-xs text-muted-foreground">Avg XP</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <Flame className="w-5 h-5 text-orange-400 mb-2" />
          <p className="text-2xl font-bold">
            {Math.max(...approvedLinks.map(l => (l.student as any)?.streak || 0), 0)}
          </p>
          <p className="text-xs text-muted-foreground">Best Streak</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <Clock className="w-5 h-5 text-blue-400 mb-2" />
          <p className="text-2xl font-bold">
            {approvedLinks.reduce((sum, l) => sum + Math.round(((l.student as any)?.total_study_time || 0) / 60), 0)}h
          </p>
          <p className="text-xs text-muted-foreground">Total Study Time</p>
        </CardContent></Card>
      </div>

      {/* Pending approvals */}
      {pendingLinks.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-amber-500">
              <AlertCircle className="w-4 h-4" />{pendingLinks.length} Pending Request{pendingLinks.length > 1 ? 's' : ''}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingLinks.map(link => (
              <div key={link.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 text-sm">
                <div>
                  <p className="font-medium">{(link.student as any)?.full_name || 'Student'}</p>
                  <p className="text-xs text-muted-foreground">Request {formatRelativeTime(link.created_at)}</p>
                </div>
                <Badge variant="warning">Pending</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Add student / invite */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="font-semibold flex items-center gap-2"><Plus className="w-4 h-4 text-violet-400" />Student Link Karo</h3>
              <p className="text-xs text-muted-foreground mt-1">Invite code generate karo aur student ko do — wo apne account se accept kar lega</p>
            </div>
            <Button variant="gradient" onClick={() => setShowLinkForm(!showLinkForm)} size="sm">
              <QrCode className="w-4 h-4" />Generate Invite Code
            </Button>
          </div>

          {showLinkForm && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 space-y-3">
              {!inviteCode ? (
                <Button variant="outline" onClick={generateInvite} loading={creating} className="w-full">
                  Generate New Code
                </Button>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Ye code student ko do — wo Settings mein jaake "Parent Link" mein enter karega:</p>
                  <div className="flex gap-2">
                    <Input value={inviteCode} readOnly className="font-mono text-center text-lg tracking-widest" />
                    <Button variant="outline" onClick={copyCode}><Copy className="w-4 h-4" /></Button>
                  </div>
                  <p className="text-xs text-amber-500">⚠️ Ye code 24 ghante mein expire ho jata hai</p>
                  <Button variant="ghost" size="sm" onClick={generateInvite} loading={creating}>New Code</Button>
                </div>
              )}
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Student cards */}
      {approvedLinks.length === 0 && !pendingLinks.length && (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Abhi koi student linked nahi</p>
          <p className="text-sm mt-1">Upar se invite code generate karo aur student ko do</p>
        </div>
      )}

      {approvedLinks.map((link, i) => {
        const student = link.student as any;
        if (!student) return null;
        const studentSnaps = getStudentSnapshots(student.id);
        const lastWeek = studentSnaps[0];
        const weekBefore = studentSnaps[1];
        const xpTrend = lastWeek && weekBefore ? lastWeek.xp_earned - weekBefore.xp_earned : 0;

        return (
          <motion.div key={link.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                      {student.full_name?.[0]?.toUpperCase() || 'S'}
                    </div>
                    <div>
                      <h3 className="font-bold">{student.full_name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {student.board && `${student.board} · `}{student.grade_level?.replace('GRADE_', 'Grade ').replace('_', '-') || 'Grade not set'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={student.subscription_tier === 'FREE' ? 'outline' : 'default'} className={cn(student.subscription_tier !== 'FREE' && 'bg-violet-600')}>
                      {student.subscription_tier}
                    </Badge>
                    {student.streak > 0 && (
                      <Badge variant="outline" className="text-orange-400 border-orange-400/30">
                        🔥 {student.streak} day streak
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Stats row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-muted/30 rounded-xl p-3 text-center">
                    <p className="text-xl font-bold text-violet-400">{formatXP(student.xp)}</p>
                    <p className="text-[10px] text-muted-foreground">Total XP</p>
                  </div>
                  <div className="bg-muted/30 rounded-xl p-3 text-center">
                    <p className="text-xl font-bold text-blue-400">Level {student.level}</p>
                    <p className="text-[10px] text-muted-foreground">Current Level</p>
                  </div>
                  <div className="bg-muted/30 rounded-xl p-3 text-center">
                    <p className="text-xl font-bold text-green-400">{formatDuration(student.total_study_time)}</p>
                    <p className="text-[10px] text-muted-foreground">Study Time</p>
                  </div>
                  <div className="bg-muted/30 rounded-xl p-3 text-center">
                    <p className={cn('text-xl font-bold', xpTrend >= 0 ? 'text-green-400' : 'text-red-400')}>
                      {xpTrend >= 0 ? '+' : ''}{xpTrend} XP
                    </p>
                    <p className="text-[10px] text-muted-foreground">vs Last Week</p>
                  </div>
                </div>

                {/* Weekly activity */}
                {studentSnaps.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Last 4 Weeks</p>
                    <div className="grid grid-cols-4 gap-2">
                      {[...Array(4)].map((_, wi) => {
                        const snap = studentSnaps[3 - wi];
                        return (
                          <div key={wi} className={cn('rounded-lg p-2 text-center text-xs', snap ? 'bg-violet-500/10 border border-violet-500/20' : 'bg-muted/20')}>
                            <p className="font-bold text-sm">{snap ? snap.xp_earned : '—'}</p>
                            <p className="text-muted-foreground text-[10px]">XP</p>
                            {snap && <p className="text-muted-foreground text-[10px]">{snap.quizzes_completed} quizzes</p>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* This week details */}
                {lastWeek && (
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-muted/20 rounded-lg p-2 flex items-center gap-2">
                      <BookOpen className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <div><p className="font-medium">{lastWeek.quizzes_completed}</p><p className="text-muted-foreground">Quizzes</p></div>
                    </div>
                    <div className="bg-muted/20 rounded-lg p-2 flex items-center gap-2">
                      <TrendingUp className="w-3.5 h-3.5 text-green-400 shrink-0" />
                      <div><p className="font-medium">{lastWeek.average_score?.toFixed(0) || 0}%</p><p className="text-muted-foreground">Avg Score</p></div>
                    </div>
                    <div className="bg-muted/20 rounded-lg p-2 flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                      <div><p className="font-medium">{lastWeek.ai_messages_sent}</p><p className="text-muted-foreground">AI Msgs</p></div>
                    </div>
                  </div>
                )}

                {/* Profile complete check */}
                {!student.is_profile_complete && (
                  <div className="text-xs text-amber-500 bg-amber-500/10 rounded-lg px-3 py-2 flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    Student ka profile complete nahi — board aur grade set karna baqi hai
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
