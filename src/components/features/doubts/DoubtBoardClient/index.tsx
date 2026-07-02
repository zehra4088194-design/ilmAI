'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, MessageCircle, CheckCircle2, HelpCircle, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/cn';
import { ScanUpload } from '@/components/features/ocr/ScanUpload';
import { formatRelativeTime } from '@/lib/utils/format';
import { toast } from 'sonner';

export function DoubtBoardClient({ doubts, subjects, userId }: { doubts: any[]; subjects: any[]; userId: string }) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localDoubts, setLocalDoubts] = useState(doubts);

  const handleSubmit = async () => {
    if (!title.trim() || !body.trim()) { toast.error('Title aur sawal dono likhna zaroori hai'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/doubts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, subjectId: subjectId || null }),
      });
      const json = await res.json();
      if (json.status === 'error') { toast.error(json.error); return; }
      toast.success('Sawaal post ho gaya! Teacher jald jawab denge 🎓');
      setLocalDoubts([json.data, ...localDoubts]);
      setTitle(''); setBody(''); setSubjectId(''); setShowForm(false);
    } catch { toast.error('Kuch ghalat ho gaya'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-4">
      {/* Ask button / form */}
      {!showForm ? (
        <Button variant="gradient" onClick={() => setShowForm(true)}><Plus className="w-4 h-4" />Sawaal Pucho</Button>
      ) : (
        <Card className="border-violet-500/30">
          <CardContent className="p-5 space-y-3">
            <h3 className="font-semibold flex items-center gap-2"><HelpCircle className="w-4 h-4 text-violet-400" />Apna Sawaal Likho</h3>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Sawaal ka title (e.g. Newton's 3rd Law samajh nahi aya)" className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm" />
            <select value={subjectId} onChange={e => setSubjectId(e.target.value)} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm">
              <option value="">Subject select karo (optional)</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <div className="flex gap-2 items-start">
              <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Puri detail mein sawaal likho..." rows={4} className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none" />
            </div>
            <div className="flex gap-2 flex-wrap">
              <ScanUpload onTextExtracted={(text) => setBody(b => b ? `${b}\n\n${text}` : text)} trigger={<Button variant="outline" size="sm">📷 Photo se Scan</Button>} />
              <Button variant="gradient" onClick={handleSubmit} loading={submitting} className="ml-auto"><Send className="w-3.5 h-3.5" />Post Karo</Button>
              <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Doubts list */}
      <div className="space-y-3">
        {localDoubts.map((doubt, di) => (
          <motion.div key={doubt.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: di * 0.04 }}>
            <Card className={cn('transition-colors', doubt.is_resolved && 'border-green-500/30 bg-green-500/5')}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {doubt.profiles?.full_name?.[0] || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm">{doubt.title}</h3>
                      <p className="text-xs text-muted-foreground">{doubt.profiles?.full_name} · {formatRelativeTime(doubt.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {doubt.is_resolved && <Badge variant="success" className="text-xs"><CheckCircle2 className="w-3 h-3" />Resolved</Badge>}
                    {doubt.doubt_replies?.length > 0 && <Badge variant="outline" className="text-xs"><MessageCircle className="w-3 h-3" />{doubt.doubt_replies.length}</Badge>}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{doubt.body}</p>
                {doubt.doubt_replies?.length > 0 && (
                  <div className="space-y-2 border-t border-border pt-3">
                    {doubt.doubt_replies.slice(0, 2).map((reply: any) => (
                      <div key={reply.id} className={cn('flex items-start gap-2 p-2 rounded-lg text-xs', reply.is_accepted ? 'bg-green-500/10 border border-green-500/20' : 'bg-muted/30')}>
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">T</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-xs mb-0.5">Teacher</p>
                          <p className="text-muted-foreground line-clamp-2">{reply.body}</p>
                        </div>
                        {reply.is_accepted && <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
        {localDoubts.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <HelpCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Koi sawaal nahi hai abhi. Pehla sawaal tum pucho!</p>
          </div>
        )}
      </div>
    </div>
  );
}
