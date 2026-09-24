'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star, Sparkles, Layers3 } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { toast } from 'sonner';

export function FlashcardDeckGrid({ decks }: { decks: any[] }) {
  const [generating, setGenerating] = useState(false);
  const [topic, setTopic] = useState('');
  const router = useRouter();

  const generateAIDeck = async () => {
    if (!topic.trim()) { toast.error('Topic likho pehle'); return; }
    setGenerating(true);
    try {
      const res = await fetch('/api/flashcards/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic, count: 10 }) });
      const json = await res.json();
      if (json.status === 'error') { toast.error(json.error); return; }
      toast.success('Flashcards are ready!');
      setTopic('');
      router.refresh();
    } catch { toast.error('Something went wrong.'); }
    finally { setGenerating(false); }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-violet-500/10 to-indigo-500/10 border-violet-500/20">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3"><Sparkles className="w-4 h-4 text-violet-400" /><p className="font-medium text-sm">Create a New Deck with AI</p></div>
          <div className="flex gap-2">
            <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Photosynthesis, Trigonometry formulas..." className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm" />
            <Button variant="gradient" onClick={generateAIDeck} loading={generating}>Generate</Button>
          </div>
        </CardContent>
      </Card>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {decks.map(deck => (
          <Card key={deck.id} className="hover:border-violet-500/30 transition-colors cursor-pointer" onClick={() => router.push(`/flashcards/${deck.id}/study`)}>
            <CardContent className="p-5">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: `${deck.cover_color || '#7c3aed'}20` }}>
                <Star className="w-5 h-5" style={{ color: deck.cover_color || '#7c3aed' }} />
              </div>
              <h3 className="font-semibold mb-1">{deck.name}</h3>
              <p className="text-xs text-muted-foreground">{deck.total_cards} cards</p>
            </CardContent>
          </Card>
        ))}
        {decks.length === 0 && (
          <div className="col-span-full">
            <EmptyState
              icon={Layers3}
              title="No flashcard decks yet"
              description="Enter a topic and AI will create revision flashcards. Start with formulas, definitions, dates, or chapter names."
            />
          </div>
        )}
      </div>
    </div>
  );
}
