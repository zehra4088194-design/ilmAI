'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, Brain, CheckCircle2, Sparkles, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/cn';
import { toast } from 'sonner';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const SUBJECTS_LIST = ['Physics', 'Chemistry', 'Biology', 'Mathematics', 'Computer Science', 'English', 'Urdu', 'Islamiat', 'Pakistan Studies'];
const TIME_OPTIONS = ['morning', 'afternoon', 'evening', 'night', 'flexible'];
const HOUR_OPTIONS = [1, 2, 3, 4, 5, 6];

const SESSION_COLORS: Record<string, string> = {
  new_concept: 'bg-violet-500/20 border-violet-500/40 text-violet-300',
  revision: 'bg-blue-500/20 border-blue-500/40 text-blue-300',
  practice: 'bg-green-500/20 border-green-500/40 text-green-300',
  test: 'bg-amber-500/20 border-amber-500/40 text-amber-300',
};

interface Prefs {
  availableDays: string[];
  hoursPerDay: number;
  preferredTime: string;
  subjects: string[];
  examDate: string;
  weakSubjects: string[];
  goals: string;
}

export function RoutineBuilder({ existingRoutine, userId, userTier }: {
  existingRoutine: any; userId: string; userTier: string;
}) {
  const [step, setStep] = useState<'form' | 'loading' | 'result'>(existingRoutine ? 'result' : 'form');
  const [prefs, setPrefs] = useState<Prefs>({
    availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    hoursPerDay: 3,
    preferredTime: 'evening',
    subjects: ['Physics', 'Chemistry', 'Mathematics'],
    examDate: '',
    weakSubjects: [],
    goals: '',
  });
  const [schedule, setSchedule] = useState<any>(existingRoutine?.schedule || null);

  const toggleDay = (day: string) => {
    setPrefs(p => ({
      ...p,
      availableDays: p.availableDays.includes(day) ? p.availableDays.filter(d => d !== day) : [...p.availableDays, day],
    }));
  };

  const toggleSubject = (sub: string) => {
    setPrefs(p => ({
      ...p,
      subjects: p.subjects.includes(sub) ? p.subjects.filter(s => s !== sub) : [...p.subjects, sub],
    }));
  };

  const toggleWeak = (sub: string) => {
    setPrefs(p => ({
      ...p,
      weakSubjects: p.weakSubjects.includes(sub) ? p.weakSubjects.filter(s => s !== sub) : [...p.weakSubjects, sub],
    }));
  };

  const generate = async () => {
    if (prefs.subjects.length === 0) { toast.error('Kam se kam 1 subject select karo'); return; }
    if (prefs.availableDays.length === 0) { toast.error('Kam se kam 1 din select karo'); return; }
    setStep('loading');
    try {
      const res = await fetch('/api/ai/routine', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences: prefs }),
      });
      const json = await res.json();
      if (json.status === 'error') { toast.error(json.error); setStep('form'); return; }
      setSchedule(json.data);
      setStep('result');
    } catch { toast.error('Kuch ghalat ho gaya'); setStep('form'); }
  };

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {step === 'form' && (
          <motion.div key="form" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            {/* Available Days */}
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-bold mb-3 flex items-center gap-2"><Calendar className="w-4 h-4 text-violet-400" />Kaunse din study kar sakte ho?</p>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map(day => (
                    <button key={day} onClick={() => toggleDay(day)}
                      className={cn('px-3 py-1.5 rounded-lg text-xs font-medium border transition-all', prefs.availableDays.includes(day) ? 'bg-violet-500/20 border-violet-500 text-violet-300' : 'border-border text-muted-foreground hover:border-violet-500/50')}>
                      {day.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Hours per day */}
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-bold mb-3 flex items-center gap-2"><Clock className="w-4 h-4 text-blue-400" />Roz kitne ghante study kar sakte ho?</p>
                <div className="flex gap-2 flex-wrap">
                  {HOUR_OPTIONS.map(h => (
                    <button key={h} onClick={() => setPrefs(p => ({ ...p, hoursPerDay: h }))}
                      className={cn('w-12 h-10 rounded-lg text-sm font-semibold border transition-all', prefs.hoursPerDay === h ? 'bg-blue-500/20 border-blue-500 text-blue-300' : 'border-border text-muted-foreground hover:border-blue-500/50')}>
                      {h}h
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Preferred time */}
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-bold mb-3">Kab study karna prefer karte ho?</p>
                <div className="flex gap-2 flex-wrap">
                  {TIME_OPTIONS.map(t => (
                    <button key={t} onClick={() => setPrefs(p => ({ ...p, preferredTime: t }))}
                      className={cn('px-4 py-2 rounded-lg text-sm capitalize font-medium border transition-all', prefs.preferredTime === t ? 'bg-primary/20 border-primary text-primary' : 'border-border text-muted-foreground hover:border-primary/50')}>
                      {t === 'morning' ? '🌅' : t === 'afternoon' ? '☀️' : t === 'evening' ? '🌆' : t === 'night' ? '🌙' : '🔄'} {t}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Subjects */}
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-bold mb-3 flex items-center gap-2"><Brain className="w-4 h-4 text-green-400" />Kaunse subjects padhne hain?</p>
                <div className="flex flex-wrap gap-2">
                  {SUBJECTS_LIST.map(sub => (
                    <button key={sub} onClick={() => toggleSubject(sub)}
                      className={cn('px-3 py-1.5 rounded-lg text-xs font-medium border transition-all', prefs.subjects.includes(sub) ? 'bg-green-500/20 border-green-500 text-green-300' : 'border-border text-muted-foreground hover:border-green-500/50')}>
                      {sub}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Weak subjects */}
            {prefs.subjects.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <p className="text-sm font-bold mb-3">Kaunsa subject weak hai? <span className="font-normal text-muted-foreground">(optional)</span></p>
                  <div className="flex flex-wrap gap-2">
                    {prefs.subjects.map(sub => (
                      <button key={sub} onClick={() => toggleWeak(sub)}
                        className={cn('px-3 py-1.5 rounded-lg text-xs font-medium border transition-all', prefs.weakSubjects.includes(sub) ? 'bg-red-500/20 border-red-500 text-red-300' : 'border-border text-muted-foreground hover:border-red-500/50')}>
                        {sub}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Exam Date + Goals */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Board exam kab hai? <span className="text-muted-foreground text-xs">(optional)</span></label>
                  <input type="date" value={prefs.examDate} onChange={e => setPrefs(p => ({ ...p, examDate: e.target.value }))}
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Koi khaas goal? <span className="text-muted-foreground text-xs">(optional)</span></label>
                  <input placeholder="e.g. 90%+ marks chahiye, engineering entry test ki tayari..." value={prefs.goals}
                    onChange={e => setPrefs(p => ({ ...p, goals: e.target.value }))}
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm" />
                </div>
              </CardContent>
            </Card>

            <Button variant="gradient" size="xl" className="w-full" onClick={generate}>
              <Sparkles className="w-5 h-5" />AI Se Schedule Banwao
            </Button>
          </motion.div>
        )}

        {step === 'loading' && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-16">
            <div className="w-14 h-14 mx-auto mb-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            <p className="font-semibold">AI schedule bana raha hai...</p>
            <p className="text-sm text-muted-foreground mt-2">Tumhare saare jawabaat consider kar ke personalised routine banai ja rahi hai</p>
          </motion.div>
        )}

        {step === 'result' && schedule && (
          <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-3">
              <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-violet-400">{schedule.totalHours || '—'}h</p><p className="text-xs text-muted-foreground">Weekly total</p></CardContent></Card>
              <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-blue-400">{schedule.weeklySchedule?.length || 0}</p><p className="text-xs text-muted-foreground">Study days</p></CardContent></Card>
              <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-green-400">{prefs.subjects.length}</p><p className="text-xs text-muted-foreground">Subjects</p></CardContent></Card>
            </div>

            {/* Exam strategy */}
            {schedule.examStrategy && (
              <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-4 text-sm text-violet-300">
                🎯 <strong className="text-violet-200">Strategy:</strong> {schedule.examStrategy}
              </div>
            )}

            {/* Weekly Schedule */}
            <div className="space-y-3">
              {schedule.weeklySchedule?.map((day: any, di: number) => (
                <Card key={di}>
                  <CardContent className="p-4">
                    <p className="font-bold mb-3 text-sm">{day.day}</p>
                    <div className="space-y-2">
                      {day.sessions?.map((session: any, si: number) => (
                        <div key={si} className={cn('flex items-start gap-3 p-3 rounded-lg border text-xs', SESSION_COLORS[session.type] || SESSION_COLORS.revision)}>
                          <div className="shrink-0 font-semibold">{session.duration}m</div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold">{session.subject}</p>
                            <p className="opacity-80">{session.topic}</p>
                          </div>
                          {session.priority === 'high' && <Badge variant="destructive" className="text-[10px] shrink-0">High</Badge>}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Tips & Goals */}
            <div className="grid md:grid-cols-2 gap-4">
              {schedule.studyTips?.length > 0 && (
                <Card><CardContent className="p-4">
                  <p className="font-bold text-sm mb-3">💡 Study Tips</p>
                  <ul className="space-y-2">{schedule.studyTips.map((tip: string, i: number) => <li key={i} className="text-xs text-muted-foreground flex gap-2"><span className="text-violet-400 shrink-0">→</span>{tip}</li>)}</ul>
                </CardContent></Card>
              )}
              {schedule.weeklyGoals?.length > 0 && (
                <Card><CardContent className="p-4">
                  <p className="font-bold text-sm mb-3">🎯 Weekly Goals</p>
                  <ul className="space-y-2">{schedule.weeklyGoals.map((goal: string, i: number) => <li key={i} className="text-xs text-muted-foreground flex gap-2"><CheckCircle2 className="w-3 h-3 text-green-400 shrink-0 mt-0.5" />{goal}</li>)}</ul>
                </CardContent></Card>
              )}
            </div>

            <Button variant="outline" className="w-full" onClick={() => setStep('form')}>
              <Sparkles className="w-4 h-4" />Dobara Banao (Settings Change Karo)
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
