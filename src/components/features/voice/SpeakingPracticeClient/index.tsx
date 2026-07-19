'use client';

import { useRef, useState } from 'react';
import { Loader2, Mic, Square, WandSparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AiAnswerRenderer } from '@/components/features/ai/AiAnswerRenderer';
import { toast } from 'sonner';

export function SpeakingPracticeClient() {
  const [language, setLanguage] = useState('en');
  const [difficulty, setDifficulty] = useState('intermediate');
  const [prompt, setPrompt] = useState('Explain your favorite topic from today in three clear sentences.');
  const [transcript, setTranscript] = useState('');
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ score?: number; text: string } | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const nextPrompt = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/voice/practice?language=${language}&difficulty=${difficulty}`);
      const json = await res.json();
      setPrompt(json.data.prompt);
      setTranscript('');
      setFeedback(null);
      setAudioBlob(null);
    } finally {
      setLoading(false);
    }
  };

  const start = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    chunksRef.current = [];
    const recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (event) => event.data.size && chunksRef.current.push(event.data);
    recorder.onstop = () => {
      setAudioBlob(new Blob(chunksRef.current, { type: 'audio/webm' }));
      stream.getTracks().forEach((track) => track.stop());
    };
    recorder.start();
    recorderRef.current = recorder;
    setRecording(true);
  };

  const stop = () => {
    recorderRef.current?.stop();
    setRecording(false);
  };

  const submit = async () => {
    if (!transcript.trim()) {
      toast.error('Write a transcript or fill it using speech-to-text.');
      return;
    }
    setLoading(true);
    try {
      const form = new FormData();
      form.append('language', language);
      form.append('prompt_text', prompt);
      form.append('transcript', transcript);
      if (audioBlob) form.append('audio', audioBlob, 'attempt.webm');
      const res = await fetch('/api/voice/practice', { method: 'POST', body: form });
      const json = await res.json();
      if (json.status === 'error') {
        toast.error(json.error);
        return;
      }
      setFeedback({ score: json.data.score, text: json.data.feedback });
    } catch {
      toast.error('Speaking feedback could not be generated.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Badge variant="secondary" className="mb-3">Pro+</Badge>
        <h1 className="text-2xl font-bold">AI Speaking Practice</h1>
        <p className="text-muted-foreground">Read the prompt, record yourself, paste or write the transcript, and get AI pronunciation and viva-confidence feedback.</p>
      </div>
      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <select value={language} onChange={(event) => setLanguage(event.target.value)} className="h-10 rounded-lg border bg-background px-3 text-sm">
              <option value="en">English</option>
              <option value="ur">Urdu</option>
              <option value="hi">Hindi</option>
            </select>
            <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)} className="h-10 rounded-lg border bg-background px-3 text-sm">
              <option value="basic">Basic</option>
              <option value="intermediate">Intermediate</option>
              <option value="difficult">Difficult</option>
            </select>
          </div>
          <div className="rounded-xl border bg-muted/20 p-4">
            <p className="text-xs font-bold uppercase text-muted-foreground">Read this aloud</p>
            <p className="mt-2 text-lg font-semibold leading-8">{prompt}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={nextPrompt} disabled={loading}><WandSparkles className="h-4 w-4" />New prompt</Button>
            {!recording ? (
              <Button variant="gradient" onClick={start}><Mic className="h-4 w-4" />Start recording</Button>
            ) : (
              <Button variant="destructive" onClick={stop}><Square className="h-4 w-4" />Stop</Button>
            )}
          </div>
          {audioBlob && <audio src={URL.createObjectURL(audioBlob)} controls className="w-full" />}
          <textarea value={transcript} onChange={(event) => setTranscript(event.target.value)} rows={5} className="w-full rounded-xl border bg-background p-3 text-sm" placeholder="Write or paste your speech transcript here..." />
          <Button variant="gradient" onClick={submit} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}
            Get AI feedback
          </Button>
        </CardContent>
      </Card>
      {feedback && <AiAnswerRenderer content={`### Score: ${feedback.score ?? '-'} / 100\n\n${feedback.text}`} label="Speaking Feedback" />}
    </div>
  );
}
