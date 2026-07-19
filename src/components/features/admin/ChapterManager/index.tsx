'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, ChevronUp, ChevronDown, Pencil, Check, X, ListTree, Loader2 } from 'lucide-react';
import { BOARDS, GRADE_LEVELS } from '@/lib/constants';
import { toast } from 'sonner';

interface Chapter {
  id: string;
  name: string;
  order_index: number;
  boards: string[];
  grade_levels: string[];
  is_active: boolean;
}

interface Topic {
  id: string;
  name: string;
  order_index?: number;
  is_active?: boolean;
}

interface ChapterManagerProps {
  subjectId: string;
  subjectBoards: string[];
  subjectGradeLevels: string[];
  initialChapters: Chapter[];
}

function boardsByCountry(subjectBoards: string[]) {
  const relevant = BOARDS.filter((b) => subjectBoards.includes(b.value));
  return {
    PK: relevant.filter((b) => b.country === 'PK' || !('country' in b)),
    IN: relevant.filter((b) => b.country === 'IN'),
  };
}

export function ChapterManager({ subjectId, subjectBoards, subjectGradeLevels, initialChapters }: ChapterManagerProps) {
  const [chapters, setChapters] = useState<Chapter[]>(initialChapters);
  const [newName, setNewName] = useState('');
  const [newBoards, setNewBoards] = useState<string[]>([]);
  const [newGradeLevels, setNewGradeLevels] = useState<string[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editBoards, setEditBoards] = useState<string[]>([]);
  const [editGradeLevels, setEditGradeLevels] = useState<string[]>([]);
  const [expandedChapterId, setExpandedChapterId] = useState<string | null>(null);
  const [topicsByChapter, setTopicsByChapter] = useState<Record<string, Topic[]>>({});
  const [loadingTopics, setLoadingTopics] = useState<string | null>(null);
  const [newTopicName, setNewTopicName] = useState('');
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [editTopicName, setEditTopicName] = useState('');

  const grouped = boardsByCountry(subjectBoards);
  const availableGrades = GRADE_LEVELS.filter((g) => subjectGradeLevels.includes(g.value));

  const toggleValue = (list: string[], value: string, setList: (v: string[]) => void) => {
    setList(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    if (availableGrades.length > 1 && newGradeLevels.length === 0) {
      toast.error('This subject has multiple classes. Select a class for the chapter.');
      return;
    }
    setIsAdding(true);
    try {
      const res = await fetch('/api/admin/chapters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectId, name: newName.trim(), boards: newBoards, gradeLevels: newGradeLevels }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setChapters((prev) => [...prev, json.chapter].sort((a, b) => a.order_index - b.order_index));
      setNewName('');
      setNewBoards([]);
      setNewGradeLevels([]);
      toast.success('Chapter add ho gaya!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Kuch ghalat ho gaya');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this chapter? Its topics and questions will also be deleted.')) return;
    try {
      const res = await fetch(`/api/admin/chapters/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error);
      setChapters((prev) => prev.filter((c) => c.id !== id));
      toast.success('Chapter delete ho gaya');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed.');
    }
  };

  const startEdit = (c: Chapter) => {
    setEditingId(c.id);
    setEditName(c.name);
    setEditBoards(c.boards || []);
    setEditGradeLevels(c.grade_levels || []);
  };

  const saveEdit = async (id: string) => {
    if (availableGrades.length > 1 && editGradeLevels.length === 0) {
      toast.error('This subject has multiple classes. Select a class for the chapter.');
      return;
    }
    try {
      const res = await fetch(`/api/admin/chapters/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim(), boards: editBoards, gradeLevels: editGradeLevels }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setChapters((prev) => prev.map((c) => (c.id === id ? json.chapter : c)));
      setEditingId(null);
      toast.success('Update ho gaya!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed.');
    }
  };

  const move = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= chapters.length) return;
    const a = chapters[index]!;
    const b = chapters[target]!;
    const reordered = [...chapters];
    [reordered[index], reordered[target]] = [reordered[target]!, reordered[index]!];
    setChapters(reordered);
    try {
      await Promise.all([
        fetch(`/api/admin/chapters/${a.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderIndex: b.order_index }) }),
        fetch(`/api/admin/chapters/${b.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderIndex: a.order_index }) }),
      ]);
    } catch {
      toast.error('Reordering could not be saved. Refresh and try again.');
    }
  };

  const BoardCheckboxes = ({ selected, onToggle }: { selected: string[]; onToggle: (v: string) => void }) => (
    <div className="flex flex-wrap gap-3 text-xs">
      {grouped.PK.length > 0 && (
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-muted-foreground font-medium">Pakistan:</span>
          {grouped.PK.map((b) => (
            <label key={b.value} className="flex items-center gap-1 cursor-pointer">
              <input type="checkbox" checked={selected.includes(b.value)} onChange={() => onToggle(b.value)} />
              {b.value}
            </label>
          ))}
        </div>
      )}
      {grouped.IN.length > 0 && (
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-muted-foreground font-medium">India:</span>
          {grouped.IN.map((b) => (
            <label key={b.value} className="flex items-center gap-1 cursor-pointer">
              <input type="checkbox" checked={selected.includes(b.value)} onChange={() => onToggle(b.value)} />
              {b.value}
            </label>
          ))}
        </div>
      )}
    </div>
  );

  const GradeCheckboxes = ({ selected, onToggle }: { selected: string[]; onToggle: (v: string) => void }) => (
    <div className="flex flex-wrap gap-2 text-xs">
      {availableGrades.map((grade) => (
        <label key={grade.value} className="flex items-center gap-1 cursor-pointer">
          <input type="checkbox" checked={selected.includes(grade.value)} onChange={() => onToggle(grade.value)} />
          {grade.label}
        </label>
      ))}
    </div>
  );

  const gradeLabel = (value: string) => GRADE_LEVELS.find((g) => g.value === value)?.label || value;

  const loadTopics = async (chapterId: string) => {
    setExpandedChapterId(chapterId);
    if (topicsByChapter[chapterId]) return;
    setLoadingTopics(chapterId);
    try {
      const res = await fetch(`/api/admin/topics?chapterId=${chapterId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setTopicsByChapter((prev) => ({ ...prev, [chapterId]: json.topics || [] }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Topics could not be loaded.');
    } finally {
      setLoadingTopics(null);
    }
  };

  const addTopic = async (chapterId: string) => {
    if (!newTopicName.trim()) return;
    try {
      const res = await fetch('/api/admin/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapterId, name: newTopicName.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setTopicsByChapter((prev) => ({ ...prev, [chapterId]: [...(prev[chapterId] || []), json.topic] }));
      setNewTopicName('');
      toast.success('Topic add ho gaya');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Topic could not be added.');
    }
  };

  const saveTopic = async (chapterId: string, topicId: string) => {
    if (!editTopicName.trim()) return;
    try {
      const res = await fetch(`/api/admin/topics/${topicId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editTopicName.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setTopicsByChapter((prev) => ({
        ...prev,
        [chapterId]: (prev[chapterId] || []).map((topic) => (topic.id === topicId ? json.topic : topic)),
      }));
      setEditingTopicId(null);
      toast.success('Topic update ho gaya');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Topic could not be updated.');
    }
  };

  const deleteTopic = async (chapterId: string, topicId: string) => {
    if (!confirm('Delete this topic?')) return;
    try {
      const res = await fetch(`/api/admin/topics/${topicId}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setTopicsByChapter((prev) => ({ ...prev, [chapterId]: (prev[chapterId] || []).filter((topic) => topic.id !== topicId) }));
      toast.success('Topic delete ho gaya');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Topic could not be deleted.');
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-5 space-y-3">
          <p className="text-sm font-semibold">Add a new chapter</p>
          <div className="flex gap-2">
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Chapter ka naam (e.g. Kinematics)" onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }} />
            <Button onClick={handleAdd} disabled={isAdding || !newName.trim()}><Plus className="w-4 h-4 mr-1" /> Add</Button>
          </div>
          <BoardCheckboxes selected={newBoards} onToggle={(v) => toggleValue(newBoards, v, setNewBoards)} />
          <GradeCheckboxes selected={newGradeLevels} onToggle={(v) => toggleValue(newGradeLevels, v, setNewGradeLevels)} />
          <p className="text-[11px] text-muted-foreground">
            If no board or class is selected, the chapter will appear across all subject boards and classes.
          </p>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {chapters.map((c, i) => (
          <Card key={c.id}>
            <CardContent className="p-4">
              {editingId === c.id ? (
                <div className="space-y-3">
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                  <BoardCheckboxes selected={editBoards} onToggle={(v) => toggleValue(editBoards, v, setEditBoards)} />
                  <GradeCheckboxes selected={editGradeLevels} onToggle={(v) => toggleValue(editGradeLevels, v, setEditGradeLevels)} />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => saveEdit(c.id)}><Check className="w-3.5 h-3.5 mr-1" /> Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}><X className="w-3.5 h-3.5 mr-1" /> Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex flex-col shrink-0">
                    <button onClick={() => move(i, -1)} disabled={i === 0} className="disabled:opacity-20"><ChevronUp className="w-3.5 h-3.5" /></button>
                    <button onClick={() => move(i, 1)} disabled={i === chapters.length - 1} className="disabled:opacity-20"><ChevronDown className="w-3.5 h-3.5" /></button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{i + 1}. {c.name}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(c.boards || []).length === 0 ? (
                        <Badge variant="secondary" className="text-[10px]">All boards</Badge>
                      ) : (
                        c.boards.map((b) => <Badge key={b} variant="secondary" className="text-[10px]">{b}</Badge>)
                      )}
                      {(c.grade_levels || []).length === 0 ? (
                        <Badge variant="outline" className="text-[10px]">All classes</Badge>
                      ) : (
                        c.grade_levels.map((level) => <Badge key={level} variant="outline" className="text-[10px]">{gradeLabel(level)}</Badge>)
                      )}
                    </div>
                  </div>
                  <Button size="icon-sm" variant="ghost" onClick={() => startEdit(c)}><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button size="icon-sm" variant="ghost" onClick={() => expandedChapterId === c.id ? setExpandedChapterId(null) : loadTopics(c.id)}><ListTree className="w-3.5 h-3.5" /></Button>
                  <Button size="icon-sm" variant="ghost" onClick={() => handleDelete(c.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                </div>
              )}
              {expandedChapterId === c.id && editingId !== c.id && (
                <div className="mt-4 rounded-lg border bg-muted/20 p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">Topics</p>
                    {loadingTopics === c.id && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  </div>
                  <div className="flex gap-2">
                    <Input value={newTopicName} onChange={(e) => setNewTopicName(e.target.value)} placeholder="Topic name" onKeyDown={(e) => { if (e.key === 'Enter') addTopic(c.id); }} />
                    <Button size="sm" onClick={() => addTopic(c.id)} disabled={!newTopicName.trim()}><Plus className="w-3.5 h-3.5" /> Add</Button>
                  </div>
                  <div className="space-y-2">
                    {(topicsByChapter[c.id] || []).map((topic) => (
                      <div key={topic.id} className="flex items-center gap-2 rounded-md border bg-background/80 p-2">
                        {editingTopicId === topic.id ? (
                          <>
                            <Input value={editTopicName} onChange={(e) => setEditTopicName(e.target.value)} className="h-8" />
                            <Button size="icon-sm" onClick={() => saveTopic(c.id, topic.id)}><Check className="w-3.5 h-3.5" /></Button>
                            <Button size="icon-sm" variant="ghost" onClick={() => setEditingTopicId(null)}><X className="w-3.5 h-3.5" /></Button>
                          </>
                        ) : (
                          <>
                            <span className="flex-1 text-sm">{topic.name}</span>
                            <Button size="icon-sm" variant="ghost" onClick={() => { setEditingTopicId(topic.id); setEditTopicName(topic.name); }}><Pencil className="w-3.5 h-3.5" /></Button>
                            <Button size="icon-sm" variant="ghost" onClick={() => deleteTopic(c.id, topic.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                          </>
                        )}
                      </div>
                    ))}
                    {loadingTopics !== c.id && (topicsByChapter[c.id] || []).length === 0 && (
                      <p className="py-3 text-center text-sm text-muted-foreground">No topics yet. Add one above.</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {chapters.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No chapters yet. Add one above.</p>}
      </div>
    </div>
  );
}
