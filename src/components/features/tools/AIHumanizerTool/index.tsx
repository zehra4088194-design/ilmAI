'use client';

import { useState } from 'react';
import { Copy, Loader2, Sparkles, WandSparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AiAnswerRenderer } from '@/components/features/ai/AiAnswerRenderer';
import { BrandLoader } from '@/components/ui/BrandLoader';

const TONES = ['Natural', 'Academic', 'Simple', 'Professional', 'Roman Urdu'];
const LANGUAGES = ['English', 'Urdu', 'Roman Urdu'];

export function AIHumanizerTool() {
  const [text, setText] = useState('');
  const [tone, setTone] = useState('Natural');
  const [language, setLanguage] = useState('English');
  const [preserveMeaning, setPreserveMeaning] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');

  async function humanize() {
    if (text.trim().length < 20) {
      toast.error('Paste at least 20 characters.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/ai/humanizer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, tone: tone.toLowerCase(), language, preserveMeaning }),
      });
      const json = await res.json();
      if (json.status === 'error') {
        toast.error(json.error);
        return;
      }
      setResult(json.data.text);
      toast.success('Text humanized.');
    } catch {
      toast.error('The humanizer could not return a response.');
    } finally {
      setLoading(false);
    }
  }

  async function copyResult() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
      toast.success('Humanized text copied.');
    } catch {
      toast.error('The text could not be copied.');
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <WandSparkles className="h-4 w-4 text-violet-400" />
            Humanize Text
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Paste AI-like text</label>
            <Textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Paste essay, assignment paragraph, answer, caption, or notes here..."
              className="min-h-56 resize-none"
            />
            <p className="mt-2 text-xs text-muted-foreground">{text.trim().length} characters</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <SelectField label="Tone" value={tone} onChange={setTone} options={TONES} />
            <SelectField label="Language" value={language} onChange={setLanguage} options={LANGUAGES} />
          </div>

          <label className="flex items-start gap-2 rounded-lg border bg-muted/20 p-3 text-sm">
            <input
              type="checkbox"
              checked={preserveMeaning}
              onChange={(event) => setPreserveMeaning(event.target.checked)}
              className="mt-1"
            />
            <span>
              <span className="font-medium">Preserve meaning</span>
              <span className="block text-xs text-muted-foreground">Facts and key points stay unchanged while the wording becomes more natural.</span>
            </span>
          </label>

          <Button variant="gradient" className="w-full" onClick={humanize} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Humanize
          </Button>

          <p className="rounded-lg border border-amber-500/25 bg-amber-500/10 p-3 text-xs leading-5 text-amber-700 dark:text-amber-300">
            Use this as a study draft. Review, personalize, and verify before submission.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <Badge variant="secondary" className="mb-2">AI Tool</Badge>
            <CardTitle className="text-base">Humanized Output</CardTitle>
          </div>
          <Button variant="outline" size="sm" onClick={copyResult} disabled={!result}>
            <Copy className="h-3.5 w-3.5" />
            Copy
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <BrandLoader label="The assistant is making the text sound more natural..." className="min-h-80" />
          ) : result ? (
            <AiAnswerRenderer content={result} />
          ) : (
            <div className="flex min-h-80 flex-col items-center justify-center text-center">
              <WandSparkles className="mb-4 h-10 w-10 text-violet-400" />
              <h2 className="font-semibold">Your humanized result will appear here</h2>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Paste AI-generated text on the left to make it more natural, readable, and student-friendly.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</label>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </div>
  );
}
