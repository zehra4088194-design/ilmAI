'use client';
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Star, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export function FlashcardDeckGrid({ decks }: { decks: any[] }) {
  const [generating, setGenerating] = useState(false);
  const [topic, setTopic] = useState('');

  const generateAIDeck = async () => {
    if (!topic.trim()) { toast.error('Topic likho pehle'); return; }
    setGenerating(true);
    try {
      const res = await fetch('/api/ai/flashcards', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic, count: 10 }) });
      const json = await res.json();
      if (json.status === 'error') { toast.error(json.error); return; }
      toast.success('Flashcards ban gaye!');
      setTopic('');
    } catch { toast.error('Kuch ghalat ho gaya'); }
    finally { setGenerating(false); }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-violet-500/10 to-indigo-500/10 border-violet-500/20">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3"><Sparkles className="w-4 h-4 text-violet-400" /><p className="font-medium text-sm">AI Se Naya Deck Banao</p></div>
          <div className="flex gap-2">
            <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Photosynthesis, Trigonometry formulas..." className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm" />
            <Button variant="gradient" onClick={generateAIDeck} loading={generating}>Generate</Button>
          </div>
        </CardContent>
      </Card>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {decks.map(deck => (
          <Card key={deck.id} className="hover:border-violet-500/30 transition-colors cursor-pointer">
            <CardContent className="p-5">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: `${deck.cover_color || '#7c3aed'}20` }}>
                <Star className="w-5 h-5" style={{ color: deck.cover_color || '#7c3aed' }} />
              </div>
              <h3 className="font-semibold mb-1">{deck.name}</h3>
              <p className="text-xs text-muted-foreground">{deck.total_cards} cards</p>
            </CardContent>
          </Card>
        ))}
        {decks.length === 0 && <div className="col-span-full text-center py-8 text-muted-foreground">Koi deck nahi hai abhi. Upar se AI se banao!</div>}
      </div>
    </div>
  );
}
