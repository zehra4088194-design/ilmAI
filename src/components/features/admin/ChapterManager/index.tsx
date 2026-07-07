'use client';
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, ChevronUp, ChevronDown, Pencil, Check, X } from 'lucide-react';
import { BOARDS } from '@/lib/constants';
import { toast } from 'sonner';

interface Chapter {
  id: string;
  name: string;
  order_index: number;
  boards: string[];
  is_active: boolean;
}

interface ChapterManagerProps {
  subjectId: string;
  subjectBoards: string[];
  initialChapters: Chapter[];
}

// Only show board checkboxes for boards this subject actually supports —
// grouped by country (PK/IN) so admins can quickly tag a chapter as
// "Pakistan-only" or "India-only" without hunting through the full list.
function boardsByCountry(subjectBoards: string[]) {
  const relevant = BOARDS.filter((b) => subjectBoards.includes(b.value));
  return {
    PK: relevant.filter((b) => b.country === 'PK' || (!('country' in b))),
    IN: relevant.filter((b) => b.country === 'IN'),
  };
}

export function ChapterManager({ subjectId, subjectBoards, initialChapters }: ChapterManagerProps) {
  const [chapters, setChapters] = useState<Chapter[]>(initialChapters);
  const [newName, setNewName] = useState('');
  const [newBoards, setNewBoards] = useState<string[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editBoards, setEditBoards] = useState<string[]>([]);

  const grouped = boardsByCountry(subjectBoards);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setIsAdding(true);
    try {
      const res = await fetch('/api/admin/chapters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectId, name: newName.trim(), boards: newBoards }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setChapters((prev) => [...prev, json.chapter].sort((a, b) => a.order_index - b.order_index));
      setNewName('');
      setNewBoards([]);
      toast.success('Chapter add ho gaya!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Kuch ghalat ho gaya');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yeh chapter delete karna hai? Iske topics/questions bhi saath delete ho jayenge.')) return;
    try {
      const res = await fetch(`/api/admin/chapters/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error);
      setChapters((prev) => prev.filter((c) => c.id !== id));
      toast.success('Chapter delete ho gaya');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete nahi hua');
    }
  };

  const startEdit = (c: Chapter) => {
    setEditingId(c.id);
    setEditName(c.name);
    setEditBoards(c.boards || []);
  };

  const saveEdit = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/chapters/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim(), boards: editBoards }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setChapters((prev) => prev.map((c) => (c.id === id ? json.chapter : c)));
      setEditingId(null);
      toast.success('Update ho gaya!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update nahi hua');
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
      toast.error('Reorder save nahi hua, refresh karke dobara try karo');
    }
  };

  const toggleBoard = (list: string[], value: string, setList: (v: string[]) => void) => {
    setList(list.includes(value) ? list.filter((b) => b !== value) : [...list, value]);
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

  return (
    <div className="space-y-4">
      {/* Add new chapter */}
      <Card>
        <CardContent className="p-5 space-y-3">
          <p className="text-sm font-semibold">Naya chapter add karo</p>
          <div className="flex gap-2">
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Chapter ka naam (e.g. Kinematics)" onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }} />
            <Button onClick={handleAdd} disabled={isAdding || !newName.trim()}><Plus className="w-4 h-4 mr-1" /> Add</Button>
          </div>
          <BoardCheckboxes selected={newBoards} onToggle={(v) => toggleBoard(newBoards, v, setNewBoards)} />
          <p className="text-[11px] text-muted-foreground">Koi board select nahi kiya to yeh chapter subject ke SAARE boards par dikhega. Sirf Pakistan ya sirf India ke liye alag rakhne ke liye respective boards select karo.</p>
        </CardContent>
      </Card>

      {/* Chapter list */}
      <div className="space-y-2">
        {chapters.map((c, i) => (
          <Card key={c.id}>
            <CardContent className="p-4">
              {editingId === c.id ? (
                <div className="space-y-3">
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                  <BoardCheckboxes selected={editBoards} onToggle={(v) => toggleBoard(editBoards, v, setEditBoards)} />
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
                    </div>
                  </div>
                  <Button size="icon-sm" variant="ghost" onClick={() => startEdit(c)}><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button size="icon-sm" variant="ghost" onClick={() => handleDelete(c.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {chapters.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Abhi koi chapter nahi hai. Upar se add karo.</p>}
      </div>
    </div>
  );
}
