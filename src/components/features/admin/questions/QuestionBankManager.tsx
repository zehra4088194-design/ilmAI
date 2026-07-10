'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { BOARDS, GRADE_LEVELS } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

type Subject = { id: string; name: string; grade_levels?: string[]; boards?: string[] };
type Chapter = { id: string; name: string; grade_levels?: string[]; boards?: string[] };
type Topic = { id: string; name: string };
type Question = {
  id: string;
  type: 'MCQ' | 'SHORT' | 'LONG';
  text: string;
  subject_name?: string | null;
  chapter_name?: string | null;
  topic_name?: string | null;
  is_verified: boolean;
  difficulty: string;
};

export function QuestionBankManager() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [grade, setGrade] = useState('GRADE_9');
  const [board, setBoard] = useState('FBISE');
  const [subjectId, setSubjectId] = useState('');
  const [chapterId, setChapterId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [type, setType] = useState<'MCQ' | 'SHORT'>('MCQ');
  const [text, setText] = useState('');
  const [optionsText, setOptionsText] = useState('A) \nB) \nC) \nD) ');
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [explanation, setExplanation] = useState('');

  const filteredSubjects = useMemo(() => {
    return subjects.filter((subject) => {
      const gradeOk = !subject.grade_levels?.length || subject.grade_levels.includes(grade);
      const boardOk = !subject.boards?.length || subject.boards.includes(board);
      return gradeOk && boardOk;
    });
  }, [subjects, grade, board]);

  const filteredChapters = useMemo(() => {
    return chapters.filter((chapter) => {
      const gradeOk = !chapter.grade_levels?.length || chapter.grade_levels.includes(grade);
      const boardOk = !chapter.boards?.length || chapter.boards.includes(board);
      return gradeOk && boardOk;
    });
  }, [chapters, grade, board]);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const [questionsRes, subjectsRes] = await Promise.all([
        fetch('/api/admin/questions'),
        fetch('/api/admin/subjects'),
      ]);
      const [questionsJson, subjectsJson] = await Promise.all([questionsRes.json(), subjectsRes.json()]);
      if (!questionsRes.ok) throw new Error(questionsJson.error || 'Questions load nahi hue');
      setQuestions(questionsJson.questions || []);
      setSubjects(subjectsJson.subjects || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Question bank load nahi hua');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    setSubjectId('');
    setChapterId('');
    setTopicId('');
  }, [grade, board]);

  useEffect(() => {
    if (!subjectId) {
      setChapters([]);
      return;
    }
    fetch(`/api/admin/chapters?subjectId=${subjectId}`)
      .then((response) => response.json())
      .then((json) => setChapters(json.chapters || []))
      .catch(() => setChapters([]));
  }, [subjectId]);

  useEffect(() => {
    if (!chapterId) {
      setTopics([]);
      return;
    }
    fetch(`/api/admin/topics?chapterId=${chapterId}`)
      .then((response) => response.json())
      .then((json) => setTopics(json.topics || []))
      .catch(() => setTopics([]));
  }, [chapterId]);

  function parseOptions() {
    return optionsText
      .split('\n')
      .map((line, index) => {
        const id = String.fromCharCode(65 + index);
        const text = line.replace(/^[A-D]\)\s*/i, '').trim();
        return text ? { id, text } : null;
      })
      .filter(Boolean);
  }

  async function addQuestion() {
    if (!subjectId || !chapterId || !text.trim()) {
      toast.error('Subject, chapter aur question text zaroori hain');
      return;
    }
    const options = parseOptions();
    if (type === 'MCQ' && (options.length < 2 || !correctAnswer.trim())) {
      toast.error('MCQ ke liye options aur correct answer zaroori hain');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject_id: subjectId,
          chapter_id: chapterId,
          topic_id: topicId || null,
          type,
          text,
          options,
          correct_answer: type === 'MCQ' ? correctAnswer.trim().toUpperCase() : correctAnswer.trim(),
          explanation: explanation.trim() || null,
          board,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success('Question add ho gaya');
      setText('');
      setCorrectAnswer('');
      setExplanation('');
      setOptionsText('A) \nB) \nC) \nD) ');
      await refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Question add nahi hua');
    } finally {
      setSaving(false);
    }
  }

  async function deleteQuestion(id: string) {
    if (!confirm('Question delete karna hai?')) return;
    const res = await fetch(`/api/admin/questions/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      toast.error('Question delete nahi hua');
      return;
    }
    setQuestions((current) => current.filter((question) => question.id !== id));
    toast.success('Question delete ho gaya');
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <Select label="Class" value={grade} onChange={setGrade} options={GRADE_LEVELS.map((item) => ({ value: item.value, label: item.label }))} />
            <Select label="Board" value={board} onChange={setBoard} options={BOARDS.map((item) => ({ value: item.value, label: item.label }))} />
            <Select label="Subject" value={subjectId} onChange={(value) => { setSubjectId(value); setChapterId(''); }} options={filteredSubjects.map((item) => ({ value: item.id, label: item.name }))} placeholder="Subject" />
            <Select label="Chapter" value={chapterId} onChange={setChapterId} options={filteredChapters.map((item) => ({ value: item.id, label: item.name }))} placeholder="Chapter" />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <Select label="Topic" value={topicId} onChange={setTopicId} options={topics.map((item) => ({ value: item.id, label: item.name }))} placeholder="Optional topic" />
            <Select label="Question Type" value={type} onChange={(value) => setType(value as 'MCQ' | 'SHORT')} options={[{ value: 'MCQ', label: 'MCQ' }, { value: 'SHORT', label: 'Short Question' }]} />
            <Input value={correctAnswer} onChange={(event) => setCorrectAnswer(event.target.value)} placeholder={type === 'MCQ' ? 'Correct option e.g. A' : 'Model answer'} />
          </div>
          <Textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="Question text" rows={3} />
          {type === 'MCQ' && <Textarea value={optionsText} onChange={(event) => setOptionsText(event.target.value)} placeholder="A) Option one..." rows={4} />}
          <Textarea value={explanation} onChange={(event) => setExplanation(event.target.value)} placeholder="Explanation / marking guide (optional)" rows={2} />
          <Button onClick={addQuestion} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add Question
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Loading...</p>
        ) : questions.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Koi questions nahi hain. Upar se MCQ ya short question add karo.</p>
        ) : (
          questions.map((question) => (
            <Card key={question.id}>
              <CardContent className="p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{question.type}</Badge>
                  <Badge variant={question.is_verified ? 'success' : 'warning'}>{question.is_verified ? 'Verified' : 'Pending'}</Badge>
                  <Badge variant="secondary">{question.subject_name || 'Subject'} / {question.chapter_name || 'Chapter'}</Badge>
                  {question.topic_name && <Badge variant="outline">{question.topic_name}</Badge>}
                </div>
                <div className="flex gap-3">
                  <p className="flex-1 text-sm">{question.text}</p>
                  <Button size="icon-sm" variant="ghost" onClick={() => deleteQuestion(question.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

function Select({ label, value, onChange, options, placeholder }: { label: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[]; placeholder?: string }) {
  return (
    <label className="space-y-1.5 text-sm">
      <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}
