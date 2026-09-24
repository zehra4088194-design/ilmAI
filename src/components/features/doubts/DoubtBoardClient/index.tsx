'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, MessageCircle, CheckCircle2, Clock3, HelpCircle, Send, ChevronDown, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/cn';
import { ScanUpload } from '@/components/features/ocr/ScanUpload';
import { formatRelativeTime } from '@/lib/utils/format';
import { toast } from 'sonner';
import { TeacherIdentityCard } from '@/components/features/teacher/TeacherIdentityCard';
import { AiAnswerRenderer } from '@/components/features/ai/AiAnswerRenderer';

type StatusFilter = 'all' | 'answered' | 'pending';

interface Reply {
  id: string;
  body: string;
  is_accepted: boolean;
  is_peer_reply?: boolean;
  flagged?: boolean;
  teacher_id?: string;
  created_at?: string;
  profiles?:
    | { full_name?: string; avatar_url?: string | null; is_ai_operated?: boolean }
    | { full_name?: string; avatar_url?: string | null; is_ai_operated?: boolean }[];
}

interface Doubt {
  id: string;
  student_id?: string;
  title: string;
  body: string;
  is_resolved: boolean;
  created_at: string;
  subject_id?: string | null;
  profiles?: { full_name?: string };
  doubt_replies?: Reply[];
}

function replyProfile(reply: Reply) {
  return Array.isArray(reply.profiles) ? reply.profiles[0] : reply.profiles;
}

export function DoubtBoardClient({ doubts, subjects, userId }: { doubts: Doubt[]; subjects: { id: string; name: string }[]; userId: string }) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localDoubts, setLocalDoubts] = useState(doubts);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});
  const [postingAnswerFor, setPostingAnswerFor] = useState<string | null>(null);
  const [markingHelpful, setMarkingHelpful] = useState<string | null>(null);

  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('all');

  const subjectNameById = useMemo(() => Object.fromEntries(subjects.map((s) => [s.id, s.name])), [subjects]);

  const filteredDoubts = useMemo(() => {
    return localDoubts.filter((d) => {
      if (filterSubject !== 'all' && d.subject_id !== filterSubject) return false;
      if (filterStatus === 'answered' && !(d.doubt_replies && d.doubt_replies.length > 0)) return false;
      if (filterStatus === 'pending' && d.doubt_replies && d.doubt_replies.length > 0) return false;
      return true;
    });
  }, [localDoubts, filterSubject, filterStatus]);

  const handleSubmit = async () => {
    if (!title.trim() || !body.trim()) { toast.error('Enter both a title and a question.'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/doubts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, subjectId: subjectId || null }),
      });
      const json = await res.json();
      if (json.status === 'error') { toast.error(json.error); return; }
      toast.success('Question posted. A teacher will respond soon.');
      setLocalDoubts([json.data, ...localDoubts]);
      setTitle(''); setBody(''); setSubjectId(''); setShowForm(false);
      setExpandedId(json.data.id);
    } catch { toast.error('Something went wrong.'); }
    finally { setSubmitting(false); }
  };

  // Phase 3a — another student posting a peer answer to someone else's doubt.
  const handlePostAnswer = async (doubtId: string) => {
    const body = (answerDrafts[doubtId] || '').trim();
    if (!body) { toast.error('Write an answer first.'); return; }
    setPostingAnswerFor(doubtId);
    try {
      const res = await fetch(`/api/doubts/${doubtId}/replies`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      });
      const json = await res.json();
      if (json.status === 'error') { toast.error(json.error); return; }
      toast.success('Answer posted.');
      setAnswerDrafts((current) => ({ ...current, [doubtId]: '' }));
      setLocalDoubts((current) =>
        current.map((d) => (d.id === doubtId ? { ...d, doubt_replies: [...(d.doubt_replies || []), json.data] } : d))
      );
      if (json.moderation?.action === 'blocked') {
        toast.warning('This question was temporarily blocked from further peer answers by moderation.');
      }
    } catch { toast.error('Something went wrong.'); }
    finally { setPostingAnswerFor(null); }
  };

  // Phase 3a — the asker marking a peer answer helpful, which awards the answerer XP/coins.
  const handleMarkHelpful = async (doubtId: string, replyId: string) => {
    setMarkingHelpful(replyId);
    try {
      const res = await fetch(`/api/doubts/${doubtId}/replies/${replyId}/accept`, { method: 'POST' });
      const json = await res.json();
      if (json.status === 'error') { toast.error(json.error); return; }
      toast.success('Marked helpful! The answerer earned XP and coins.');
      setLocalDoubts((current) =>
        current.map((d) =>
          d.id === doubtId
            ? { ...d, doubt_replies: (d.doubt_replies || []).map((r) => (r.id === replyId ? { ...r, is_accepted: true } : r)) }
            : d
        )
      );
    } catch { toast.error('Something went wrong.'); }
    finally { setMarkingHelpful(null); }
  };

  return (
    <div className="space-y-4">
      {/* Ask button / form — prominent CTA */}
      {!showForm ? (
        <Button variant="gradient" size="lg" onClick={() => setShowForm(true)} className="w-full sm:w-auto shadow-lg shadow-violet-500/20">
          <Plus className="w-4 h-4" />Ask a New Question
        </Button>
      ) : (
        <Card className="border-violet-500/30">
          <CardContent className="p-5 space-y-3">
            <h3 className="font-semibold flex items-center gap-2"><HelpCircle className="w-4 h-4 text-violet-400" />Write Your Question</h3>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Question title (e.g. I do not understand Newton's 3rd Law)" className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm" />
            <select value={subjectId} onChange={e => setSubjectId(e.target.value)} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm">
              <option value="">Select a subject (optional)</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <div className="flex gap-2 items-start">
              <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Describe your question in detail..." rows={4} className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none" />
            </div>
            <div className="flex gap-2 flex-wrap">
              <ScanUpload onTextExtracted={(text) => setBody(b => b ? `${b}\n\n${text}` : text)} trigger={<Button variant="outline" size="sm">Scan Photo</Button>} />
              <Button asChild variant="outline" size="sm"><Link href="/scan">Scan & Solve</Link></Button>
            <Button variant="gradient" onClick={handleSubmit} loading={submitting} className="ml-auto"><Send className="w-3.5 h-3.5" />Post Question</Button>
              <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="flex items-center gap-1 text-muted-foreground text-xs shrink-0"><Filter className="w-3.5 h-3.5" />Filter:</span>
        <select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)} className="h-8 rounded-lg border border-input bg-background px-2 text-xs">
          <option value="all">Sab subjects</option>
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <div className="flex rounded-lg border border-input overflow-hidden">
          {(['all', 'answered', 'pending'] as StatusFilter[]).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={cn('px-3 h-8 text-xs font-medium transition-colors', filterStatus === status ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/50')}
            >
              {status === 'all' ? 'Sab' : status === 'answered' ? 'Answered' : 'Pending'}
            </button>
          ))}
        </div>
      </div>

      {/* Doubts list */}
      <div className="space-y-3">
        {filteredDoubts.map((doubt, di) => {
          const isExpanded = expandedId === doubt.id;
          const hasReplies = (doubt.doubt_replies?.length || 0) > 0;
          const firstReply = doubt.doubt_replies?.[0];
          const subjectName = doubt.subject_id ? subjectNameById[doubt.subject_id] : undefined;

          return (
            <motion.div key={doubt.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: di * 0.03 }}>
              <Card className={cn('transition-colors cursor-pointer', doubt.is_resolved && 'border-green-500/30 bg-green-500/5')}>
                <CardContent className="p-5" onClick={() => setExpandedId(isExpanded ? null : doubt.id)}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {doubt.profiles?.full_name?.[0] || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm">{doubt.title}</h3>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 flex-wrap">
                          {doubt.profiles?.full_name} <span className="opacity-50">·</span> <Clock3 className="w-3 h-3" />{formatRelativeTime(doubt.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {subjectName && <Badge variant="outline" className="text-xs">{subjectName}</Badge>}
                      {hasReplies ? (
                        <Badge variant="success" className="text-xs"><CheckCircle2 className="w-3 h-3" />Answered</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-amber-600 dark:text-amber-400 border-amber-500/30"><Clock3 className="w-3 h-3" />Pending</Badge>
                      )}
                      <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', isExpanded && 'rotate-180')} />
                    </div>
                  </div>

                  <p className={cn('text-sm text-muted-foreground mb-3', !isExpanded && 'line-clamp-2')}>{doubt.body}</p>

                  {!isExpanded && firstReply && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground border-t border-border pt-3">
                      <TeacherIdentityCard subjectName={subjectName} avatarOnly size="sm" />
                      <span className="line-clamp-1 flex-1">{firstReply.body.replace(/[#*_`]/g, '').slice(0, 100)}...</span>
                    </div>
                  )}

                  <AnimatePresence>
                    {isExpanded && hasReplies && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-3 border-t border-border pt-3 overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {(doubt.doubt_replies ?? []).map((reply) => {
                          const isPeer = Boolean(reply.is_peer_reply);
                          const author = replyProfile(reply);
                          const isAsker = doubt.student_id === userId;
                          const isOwnAnswer = reply.teacher_id === userId;
                          if (reply.flagged) {
                            return (
                              <div key={reply.id} className="text-muted-foreground border border-dashed border-border rounded-lg p-3 text-xs italic">
                                This answer was hidden by moderation.
                              </div>
                            );
                          }
                          return (
                            <div key={reply.id}>
                              <div className="flex items-center justify-between mb-2 gap-2">
                                {isPeer ? (
                                  <span className="flex items-center gap-2 text-xs font-medium">
                                    <span className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                                      {author?.full_name?.[0] || 'S'}
                                    </span>
                                    {author?.full_name || 'Classmate'}
                                    <Badge variant="outline" className="text-[10px]">Student answer</Badge>
                                  </span>
                                ) : (
                                  <TeacherIdentityCard subjectName={subjectName} size="sm" />
                                )}
                                <div className="flex items-center gap-2 shrink-0">
                                  {reply.is_accepted && <Badge variant="success" className="text-xs"><CheckCircle2 className="w-3 h-3" />Helpful</Badge>}
                                  {isPeer && isAsker && !isOwnAnswer && !reply.is_accepted && (
                                    <Button
                                      size="sm" variant="outline" className="h-7 text-xs"
                                      loading={markingHelpful === reply.id}
                                      onClick={(e) => { e.stopPropagation(); handleMarkHelpful(doubt.id, reply.id); }}
                                    >
                                      Mark helpful
                                    </Button>
                                  )}
                                </div>
                              </div>
                              <AiAnswerRenderer content={reply.body} feedback={{ sourceType: 'doubt_reply', sourceId: reply.id }} />
                            </div>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {isExpanded && !hasReplies && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground border-t border-border pt-3">
                      <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      A teacher is preparing an answer. It will appear here shortly...
                    </div>
                  )}

                  {isExpanded && doubt.student_id !== userId && (
                    <div className="border-t border-border pt-3 mt-3 space-y-2" onClick={(e) => e.stopPropagation()}>
                      <p className="text-xs font-medium text-muted-foreground">Know the answer? Help a classmate:</p>
                      <textarea
                        value={answerDrafts[doubt.id] || ''}
                        onChange={(e) => setAnswerDrafts((current) => ({ ...current, [doubt.id]: e.target.value }))}
                        placeholder="Write your answer..."
                        rows={2}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none"
                      />
                      <Button
                        size="sm" variant="outline"
                        loading={postingAnswerFor === doubt.id}
                        onClick={() => handlePostAnswer(doubt.id)}
                      >
                        <Send className="w-3.5 h-3.5" />Post answer
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
        {filteredDoubts.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <HelpCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>{localDoubts.length === 0 ? 'There are no questions yet. Ask the first one!' : 'No questions match this filter.'}</p>
          </div>
        )}
      </div>
    </div>
  );
}
