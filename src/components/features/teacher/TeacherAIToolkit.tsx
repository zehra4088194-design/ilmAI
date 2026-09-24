'use client';

import { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const tools = [
  ['quiz','Generate Quiz'], ['assignment','Generate Assignment'], ['worksheet','Create Worksheet'], ['weak_topics','Analyze Weak Topics'], ['report_comment','Report Card Comments'],
] as const;
export function TeacherAIToolkit() {
  const [tool,setTool] = useState<(typeof tools)[number][0]>('quiz');
  const [input,setInput] = useState('Topic: Cell structure\nClass: Grade 9\nDifficulty: mixed');
  const [result,setResult] = useState('');
  const [loading,setLoading] = useState(false);
  async function run() {
    if (!input.trim()) return toast.error('Add the topic or class data first.');
    setLoading(true); setResult('');
    try { const res = await fetch('/api/teacher/ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({operation:tool,input})}); const json=await res.json(); if(!res.ok) throw new Error(json.error||'Teacher AI failed.'); setResult(json.result||''); }
    catch(e){toast.error(e instanceof Error?e.message:'Teacher AI failed.');}
    finally{setLoading(false);}
  }
  return <div className="space-y-5"><Card><CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-violet-500" />Teacher AI Toolkit</CardTitle><p className="text-muted-foreground text-sm">Generate classroom material and analyze performance without leaving the teacher portal.</p></CardHeader><CardContent className="space-y-4"><div className="flex flex-wrap gap-2">{tools.map(([key,label])=><button key={key} type="button" onClick={()=>setTool(key)} className={`rounded-full border px-3 py-2 text-xs font-semibold ${tool===key?'border-violet-500 bg-violet-500/10 text-violet-600':''}`}>{label}</button>)}</div><Textarea value={input} onChange={e=>setInput(e.target.value)} rows={9} placeholder="Topic, class, marks, performance data..." /><Button variant="gradient" disabled={loading} onClick={()=>void run()}>{loading?<Loader2 className="h-4 w-4 animate-spin"/>:<Sparkles className="h-4 w-4"/>}Generate</Button>{result&&<div className="rounded-xl border bg-muted/20 p-4"><Badge variant="secondary">AI output</Badge><pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-6">{result}</pre></div>}</CardContent></Card></div>;
}
