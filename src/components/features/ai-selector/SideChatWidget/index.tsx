'use client';
import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight, Camera, MessageCircle, X, Send, Brain, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AIProviderSelector } from '@/components/features/ai-selector/AIProviderSelector';
import { AiAnswerRenderer } from '@/components/features/ai/AiAnswerRenderer';
import { ScanUpload } from '@/components/features/ocr/ScanUpload';
import { useAuth } from '@/hooks/auth/useAuth';
import { createClient } from '@/lib/supabase/client';
import type { AiProviderId, ModelTier } from '@/lib/ai/gateway';
import { nanoid } from 'nanoid';
import { cn } from '@/lib/utils/cn';
import { getDestinationSuggestions } from '@/lib/navigation/destinations';
import { derivePageLabel } from '@/lib/navigation/pageLabel';

interface SideChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  links?: Array<{ label: string; href: string }>;
}

type SearchLinkResult = { name?: string; subtitle?: string; href?: string };

const SEARCH_STOP_WORDS = new Set(['about','answer','batao','chahiye','from','hai','hain','help','kahan','kaise','karo','kro','kya','mein','mujhe','please','question','show','this','where']);

async function getDynamicSearchLinks(message: string) {
  const words = Array.from(new Set(message.toLowerCase().match(/[a-z0-9][a-z0-9+._-]{1,}/g)?.filter((word) => word.length >= 3 && !SEARCH_STOP_WORDS.has(word)) || [])).sort((a, b) => b.length - a.length);
  const terms = Array.from(new Set([message.trim(), ...words])).slice(0, 4);
  const responses = await Promise.allSettled(terms.map(async (term) => {
    const response = await fetch(`/api/search?q=${encodeURIComponent(term)}`);
    if (!response.ok) return [];
    const json = await response.json();
    return (json.results || []) as SearchLinkResult[];
  }));
  const links = responses.flatMap((response) => (response.status === 'fulfilled' ? response.value : []));
  return Array.from(new Map(links.filter((item) => item.href && item.name).map((item) => [item.href!, { label: item.name!, href: item.href! }])).values()).slice(0, 5);
}

const HIDE_ON_ROUTES = ['/mcq','/diagnostic','/practice','/full-test','/guess-paper','/student-chat','/parent','/settings','/ai-tutor','/scan','/notes','/university/pdf-summarizer','/university/project-builder','/university/assignment-helper','/university/essay-assistant','/university/presentation-builder','/university/pharmapulse'];

function getTeacherLinks(pathname: string | null) {
  if (pathname?.startsWith('/school')) return [{ label: 'Teacher AI Tools', href: '/school/teacher-tools' }, { label: 'Photo → Test', href: '/school/photo-test' }];
  if (pathname?.startsWith('/college')) return [{ label: 'Teacher AI Tools', href: '/college/teacher-tools' }, { label: 'Photo → Test', href: '/college/photo-test' }];
  return [{ label: 'Open Teacher Tools', href: '/teacher' }];
}

export function SideChatWidget() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<SideChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [provider, setProvider] = useState<AiProviderId>('groq');
  const [tier, setTier] = useState<ModelTier>('mini');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [chatLoaded, setChatLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const conversationIdRef = useRef<string | null>(null);
  const { user } = useAuth();
  const isFreeTier = !user || user.subscriptionTier === 'FREE';
  const isTeacher = user?.role === 'teacher';
  const shouldHide = HIDE_ON_ROUTES.some((route) => pathname?.startsWith(route));

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { if (shouldHide) { setIsOpen(false); setIsExpanded(false); } }, [shouldHide]);
  useEffect(() => {
    if (!user?.id) {
      setMessages([]); setConversationId(null); conversationIdRef.current = null; setChatLoaded(false); return;
    }
    let cancelled = false;
    void (async () => {
      const supabase = createClient();
      const { data, error } = await supabase.from('conversations').select('id,messages').eq('user_id', user.id).eq('source', 'side_chat').order('updated_at', { ascending: false }).limit(1).maybeSingle();
      if (cancelled) return;
      if (error) console.warn('Side chat load failed:', error.message);
      const id = data?.id || null;
      conversationIdRef.current = id;
      setConversationId(id);
      setMessages(Array.isArray(data?.messages) ? (data.messages as SideChatMessage[]) : []);
      setChatLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);
  useEffect(() => {
    if (!isExpanded) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setIsExpanded(false); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isExpanded]);

  if (shouldHide) return null;

  const persistMessages = async (nextMessages: SideChatMessage[], id: string) => {
    if (!user?.id || !chatLoaded) return;
    const supabase = createClient();
    const firstUser = nextMessages.find((message) => message.role === 'user');
    const { error } = await supabase.from('conversations').upsert({
      id, user_id: user.id, title: firstUser?.content?.slice(0, 80) || 'Quick Help', subject_id: null,
      messages: nextMessages, total_messages: nextMessages.length, provider: 'groq', source: 'side_chat', updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
    if (error) console.warn('Side chat persistence failed:', error.message);
    else { conversationIdRef.current = id; setConversationId(id); }
  };

  const handleScannedText = (text: string) => setInput((current) => `${current.trim() ? `${current.trim()}\n\n` : ''}Scanned text:\n${text}`);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    if (!user) {
      setInput('');
      setMessages((prev) => [...prev, { id: nanoid(), role: 'user', content: text }, { id: nanoid(), role: 'assistant', content: 'Sign in with a free account to use side chat.', links: [{ label: 'Sign in to continue', href: `/login?redirect=${encodeURIComponent(pathname || '/')}` }] }]);
      return;
    }
    setInput('');
    const id = conversationIdRef.current || conversationId || crypto.randomUUID();
    const userMsg: SideChatMessage = { id: nanoid(), role: 'user', content: text };
    const assistantMsg: SideChatMessage = { id: nanoid(), role: 'assistant', content: '', links: isTeacher ? getTeacherLinks(pathname) : getDestinationSuggestions(text) };
    const baseMessages = [...messages, userMsg, assistantMsg];
    setMessages(baseMessages);
    setIsLoading(true);
    await persistMessages(baseMessages, id);

    if (!isTeacher) {
      void getDynamicSearchLinks(text).then((dynamicLinks) => {
        if (!dynamicLinks.length) return;
        setMessages((current) => current.map((message) => message.id === assistantMsg.id ? { ...message, links: Array.from(new Map([...(message.links || []), ...dynamicLinks].map((link) => [link.href, link])).values()).slice(0, 8) } : message));
      });
    }

    try {
      const res = await fetch('/api/ai/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text, history: messages.slice(-6), provider, tier, source: 'side_chat', pageLabel: derivePageLabel(pathname) }) });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let full = '';
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          full += decoder.decode(value);
          setMessages((prev) => prev.map((message) => message.id === assistantMsg.id ? { ...message, content: full } : message));
        }
      }
      await persistMessages([...baseMessages.slice(0, -1), { ...assistantMsg, content: full }], id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Something went wrong.';
      const finalMessages = [...baseMessages.slice(0, -1), { ...assistantMsg, content: errorMessage }];
      setMessages(finalMessages);
      await persistMessages(finalMessages, id);
    } finally {
      setIsLoading(false);
    }
  };

  const dialogClass = isExpanded
    ? 'fixed left-1/2 top-1/2 z-[80] flex h-[min(86svh,48rem)] w-[min(92vw,64rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl border border-white/15 bg-background/95 shadow-2xl shadow-black/50 backdrop-blur-xl'
    : 'fixed right-2 bottom-2 z-[70] flex h-[min(40rem,calc(100svh-1rem))] w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-background shadow-2xl shadow-black/45 sm:right-5 sm:bottom-5 sm:h-[32rem] sm:w-96';

  return <>
    <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} onClick={() => setIsOpen(!isOpen)} className={cn('fixed right-5 bottom-5 z-[70] flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 shadow-2xl shadow-violet-500/30', isOpen && 'hidden')} aria-label="Open quick help chat"><MessageCircle className="h-6 w-6 text-white" /></motion.button>
    <AnimatePresence>
      {isOpen && <>
        {isExpanded && <motion.button aria-label="Close expanded chat backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsExpanded(false)} className="fixed inset-0 z-[79] cursor-default border-0 bg-black/25 p-0 backdrop-blur-md" />}
        <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }} className={dialogClass}>
          <div className="border-border/80 flex shrink-0 items-center gap-2 border-b bg-background/70 p-3 backdrop-blur-xl">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600"><Brain className="h-4 w-4 text-white" /></div>
            <div className="min-w-0 flex-1"><p className="text-sm font-semibold">Quick Help</p><p className="text-muted-foreground text-[10px]">Side chat | ask anything</p></div>
            <AIProviderSelector provider={provider} tier={tier} onChange={(nextProvider, nextTier) => { setProvider(nextProvider); setTier(nextTier); }} isFreeTier={isFreeTier} compact />
            <Button type="button" size="icon-sm" variant="ghost" onClick={() => setIsExpanded((value) => !value)} aria-label={isExpanded ? 'Minimize chat' : 'Expand chat'} title={isExpanded ? 'Minimize' : 'Expand'}>{isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}</Button>
            <button onClick={() => { setIsOpen(false); setIsExpanded(false); }} className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Close chat"><X className="h-4 w-4" /></button>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto bg-background/55 p-3 backdrop-blur-sm">
            {messages.length === 0 && <div className="px-4 py-8 text-center"><p className="text-muted-foreground text-sm">Ask a quick question here without opening the AI Tutor page.</p></div>}
            {messages.map((message) => <motion.div key={message.id} initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.18, ease: 'easeOut' }} className={cn('flex', message.role === 'user' && 'justify-end')}><div className={cn('max-w-[85%] rounded-xl px-3 py-2 text-sm shadow-sm', message.role === 'user' ? 'bg-primary text-primary-foreground' : 'border-border/70 bg-card/90 text-card-foreground border')}>
              {message.content ? (message.role === 'assistant' ? <AiAnswerRenderer content={message.content} card={false} className="prose-headings:my-1 prose-headings:text-sm prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-strong:text-foreground prose-code:text-[11px]" /> : <span className="whitespace-pre-wrap">{message.content}</span>) : <span className="text-muted-foreground">...</span>}
              {message.role === 'assistant' && message.links && message.links.length > 0 && <div className="border-border/60 mt-2 flex flex-wrap gap-1.5 border-t pt-2">{message.links.map((link) => <Link key={link.href} href={link.href} onClick={() => { setIsOpen(false); setIsExpanded(false); }} className="bg-primary/10 text-primary hover:bg-primary/20 inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors">{link.label}<ArrowUpRight className="h-3 w-3" /></Link>)}</div>}
            </div></motion.div>)}
            <div ref={scrollRef} />
          </div>
          <div className="border-border/80 flex shrink-0 items-center gap-2 border-t bg-background/90 p-3 backdrop-blur-xl">
            <ScanUpload onTextExtracted={handleScannedText} trigger={<Button type="button" size="icon-sm" variant="outline" disabled={isLoading} title="Scan photo" aria-label="Scan photo"><Camera className="h-3.5 w-3.5" /></Button>} />
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }} placeholder="Type a quick question..." disabled={isLoading} className="border-border/80 bg-background/90 flex-1 rounded-lg border px-3 py-2 text-sm transition-colors outline-none focus:border-violet-500/40 disabled:opacity-50" />
            <Button size="icon-sm" variant="gradient" onClick={handleSend} disabled={isLoading || !input.trim()}><Send className="h-3.5 w-3.5" /></Button>
          </div>
        </motion.div>
      </>}
    </AnimatePresence>
  </>;
}
