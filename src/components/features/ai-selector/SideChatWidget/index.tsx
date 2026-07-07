'use client';
import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Brain, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AIProviderSelector } from '@/components/features/ai-selector/AIProviderSelector';
import { useAuth } from '@/hooks/auth/useAuth';
import type { AiProviderId, ModelTier } from '@/lib/ai/gateway';
import { nanoid } from 'nanoid';
import { cn } from '@/lib/utils/cn';

interface SideChatMessage { id: string; role: 'user' | 'assistant'; content: string }

// Pages where the student is actively answering MCQs/questions — the floating
// widget would sit on top of options/timers, so we hide it on these routes.
// Uses startsWith so it also covers nested routes like /mcq/[subjectId].
const HIDE_ON_ROUTES = ['/mcq', '/practice', '/full-test', '/guess-paper'];

/**
 * Floating quick-help chat, available on every dashboard/marketing page
 * EXCEPT active question-answering pages (MCQ practice, full test, guess
 * paper) — see HIDE_ON_ROUTES above.
 * Separate from the full AI Tutor — this is for quick questions without
 * leaving the current page. Free tier = Groq only, same shared daily quota.
 */
export function SideChatWidget() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<SideChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [provider, setProvider] = useState<AiProviderId>('groq');
  const [tier, setTier] = useState<ModelTier>('mini');
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const isFreeTier = !user || user.subscriptionTier === 'FREE';

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const shouldHide = HIDE_ON_ROUTES.some((route) => pathname?.startsWith(route));
  if (shouldHide) return null;

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput('');
    const userMsg: SideChatMessage = { id: nanoid(), role: 'user', content: text };
    const assistantMsg: SideChatMessage = { id: nanoid(), role: 'assistant', content: '' };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: messages.slice(-6), provider, tier }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let full = '';
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          full += decoder.decode(value);
          setMessages((prev) => prev.map((m) => (m.id === assistantMsg.id ? { ...m, content: full } : m)));
        }
      }
    } catch (err) {
      setMessages((prev) => prev.map((m) => (m.id === assistantMsg.id ? { ...m, content: err instanceof Error ? err.message : 'Kuch ghalat ho gaya' } : m)));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating trigger button */}
      <motion.button
        initial={{ scale: 0 }} animate={{ scale: 1 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn('fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 shadow-2xl shadow-violet-500/30 flex items-center justify-center', isOpen && 'hidden')}
      >
        <MessageCircle className="w-6 h-6 text-white" />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-5 right-5 z-50 w-[calc(100vw-2.5rem)] sm:w-96 h-[32rem] glass rounded-2xl border border-border shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center gap-2 p-3 border-b border-border shrink-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center"><Brain className="w-4 h-4 text-white" /></div>
              <div className="flex-1">
                <p className="text-sm font-semibold">Quick Help</p>
                <p className="text-[10px] text-muted-foreground">Side chat · koi bhi sawal puchho</p>
              </div>
              <AIProviderSelector provider={provider} tier={tier} onChange={(p, t) => { setProvider(p); setTier(t); }} isFreeTier={isFreeTier} compact />
              <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {messages.length === 0 && (
                <div className="text-center py-8 px-4">
                  <p className="text-sm text-muted-foreground">Yahan se quick sawal puchho, AI Tutor page par jaane ki zaroorat nahi.</p>
                </div>
              )}
              {messages.map((m) => (
                <div key={m.id} className={cn('flex', m.role === 'user' && 'justify-end')}>
                  <div className={cn('max-w-[85%] rounded-xl px-3 py-2 text-sm', m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted/50')}>
                    {m.content || <span className="text-muted-foreground">...</span>}
                  </div>
                </div>
              ))}
              <div ref={scrollRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-border flex items-center gap-2 shrink-0">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
                placeholder="Type a quick question..."
                disabled={isLoading}
                className="flex-1 bg-muted/30 rounded-lg px-3 py-2 text-sm outline-none disabled:opacity-50"
              />
              <Button size="icon-sm" variant="gradient" onClick={handleSend} disabled={isLoading || !input.trim()}><Send className="w-3.5 h-3.5" /></Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
