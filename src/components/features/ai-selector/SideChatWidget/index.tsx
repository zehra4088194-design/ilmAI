'use client';
import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight, Camera, MessageCircle, X, Send, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AIProviderSelector } from '@/components/features/ai-selector/AIProviderSelector';
import { AiAnswerRenderer } from '@/components/features/ai/AiAnswerRenderer';
import { ScanUpload } from '@/components/features/ocr/ScanUpload';
import { useAuth } from '@/hooks/auth/useAuth';
import type { AiProviderId, ModelTier } from '@/lib/ai/gateway';
import { nanoid } from 'nanoid';
import { cn } from '@/lib/utils/cn';
import { getDestinationSuggestions } from '@/lib/navigation/destinations';

interface SideChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  links?: Array<{ label: string; href: string }>;
}

type SearchLinkResult = { name?: string; subtitle?: string; href?: string };

const SEARCH_STOP_WORDS = new Set([
  'about',
  'answer',
  'batao',
  'chahiye',
  'from',
  'hai',
  'hain',
  'help',
  'kahan',
  'kaise',
  'karo',
  'kro',
  'kya',
  'mein',
  'mujhe',
  'please',
  'question',
  'show',
  'this',
  'where',
]);

async function getDynamicSearchLinks(message: string) {
  const words = Array.from(
    new Set(
      message
        .toLowerCase()
        .match(/[a-z0-9][a-z0-9+._-]{1,}/g)
        ?.filter((word) => word.length >= 3 && !SEARCH_STOP_WORDS.has(word)) || []
    )
  ).sort((a, b) => b.length - a.length);
  const terms = Array.from(new Set([message.trim(), ...words])).slice(0, 4);

  const responses = await Promise.allSettled(
    terms.map(async (term) => {
      const response = await fetch(`/api/search?q=${encodeURIComponent(term)}`);
      if (!response.ok) return [];
      const json = await response.json();
      return (json.results || []) as SearchLinkResult[];
    })
  );

  const links = responses.flatMap((response) => (response.status === 'fulfilled' ? response.value : []));
  return Array.from(
    new Map(
      links
        .filter((item) => item.href && item.name)
        .map((item) => [item.href!, { label: item.name!, href: item.href! }])
    ).values()
  ).slice(0, 5);
}

// Pages where the floating widget can sit on top of active inputs, chat send
// buttons, tests, or editor toolbars. Uses startsWith so nested routes are
// covered too.
const HIDE_ON_ROUTES = [
  '/mcq',
  '/practice',
  '/full-test',
  '/guess-paper',
  '/student-chat',
  '/parent',
  '/settings',
  '/ai-tutor',
  '/scan',
  '/notes',
  '/university/pdf-summarizer',
  '/university/project-builder',
  '/university/assignment-helper',
  '/university/essay-assistant',
  '/university/presentation-builder',
  '/university/pharmapulse',
];

/**
 * Floating quick-help chat, available on every dashboard/marketing page
 * EXCEPT active question-answering pages (MCQ practice, full test, guess
 * paper) - see HIDE_ON_ROUTES above.
 * Separate from the full AI Tutor - this is for quick questions without
 * leaving the current page. Free tier = Assistant only, same shared daily quota.
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
  const shouldHide = HIDE_ON_ROUTES.some((route) => pathname?.startsWith(route));

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (shouldHide) setIsOpen(false);
  }, [shouldHide]);

  if (shouldHide) return null;

  const handleScannedText = (text: string) => {
    setInput((current) => {
      const prefix = current.trim() ? `${current.trim()}\n\n` : '';
      return `${prefix}Scanned text:\n${text}`;
    });
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput('');
    const userMsg: SideChatMessage = { id: nanoid(), role: 'user', content: text };
    const assistantMsg: SideChatMessage = {
      id: nanoid(),
      role: 'assistant',
      content: '',
      links: getDestinationSuggestions(text),
    };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsLoading(true);

    void getDynamicSearchLinks(text).then((dynamicLinks) => {
      if (!dynamicLinks.length) return;
      setMessages((current) =>
        current.map((message) => {
          if (message.id !== assistantMsg.id) return message;
          const merged = [...(message.links || []), ...dynamicLinks];
          return {
            ...message,
            links: Array.from(new Map(merged.map((link) => [link.href, link])).values()).slice(0, 8),
          };
        })
      );
    });

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: messages.slice(-6), provider, tier, source: 'side_chat' }),
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
          setMessages((prev) =>
            prev.map((message) => (message.id === assistantMsg.id ? { ...message, content: full } : message))
          );
        }
      }
    } catch (err) {
      setMessages((prev) =>
        prev.map((message) =>
          message.id === assistantMsg.id
            ? { ...message, content: err instanceof Error ? err.message : 'Kuch ghalat ho gaya' }
            : message
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'fixed right-5 bottom-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 shadow-2xl shadow-violet-500/30',
          isOpen && 'hidden'
        )}
      >
        <MessageCircle className="h-6 w-6 text-white" />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="bg-background fixed right-5 bottom-5 z-50 flex h-[32rem] w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-white/10 shadow-2xl shadow-black/45 sm:w-96"
          >
            <div className="border-border/80 bg-background/70 flex shrink-0 items-center gap-2 border-b p-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600">
                <Brain className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">Quick Help</p>
                <p className="text-muted-foreground text-[10px]">Side chat | koi bhi sawal puchho</p>
              </div>
              <AIProviderSelector
                provider={provider}
                tier={tier}
                onChange={(nextProvider, nextTier) => {
                  setProvider(nextProvider);
                  setTier(nextTier);
                }}
                isFreeTier={isFreeTier}
                compact
              />
              <button
                onClick={() => setIsOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="bg-background/55 flex-1 space-y-3 overflow-y-auto p-3">
              {messages.length === 0 && (
                <div className="px-4 py-8 text-center">
                  <p className="text-muted-foreground text-sm">
                    Yahan se quick sawal puchho, AI Tutor page par jaane ki zaroorat nahi.
                  </p>
                </div>
              )}
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className={cn('flex', message.role === 'user' && 'justify-end')}
                >
                  <div
                    className={cn(
                      'max-w-[85%] rounded-xl px-3 py-2 text-sm shadow-sm',
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'border-border/70 bg-card/90 text-card-foreground border'
                    )}
                  >
                    {message.content ? (
                      message.role === 'assistant' ? (
                        <AiAnswerRenderer
                          content={message.content}
                          card={false}
                          className="prose-headings:my-1 prose-headings:text-sm prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-strong:text-foreground prose-code:text-[11px]"
                        />
                      ) : (
                        <span className="whitespace-pre-wrap">{message.content}</span>
                      )
                    ) : (
                      <span className="text-muted-foreground">...</span>
                    )}
                    {message.role === 'assistant' && message.links && message.links.length > 0 && (
                      <div className="border-border/60 mt-2 flex flex-wrap gap-1.5 border-t pt-2">
                        {message.links.map((link) => (
                          <Link
                            key={link.href}
                            href={link.href}
                            onClick={() => setIsOpen(false)}
                            className="bg-primary/10 text-primary hover:bg-primary/20 inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors"
                          >
                            {link.label}
                            <ArrowUpRight className="h-3 w-3" />
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
              <div ref={scrollRef} />
            </div>

            <div className="border-border/80 bg-background/90 flex shrink-0 items-center gap-2 border-t p-3">
              <ScanUpload
                onTextExtracted={handleScannedText}
                trigger={
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="outline"
                    disabled={isLoading}
                    title="Scan photo"
                    aria-label="Scan photo"
                  >
                    <Camera className="h-3.5 w-3.5" />
                  </Button>
                }
              />
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSend();
                }}
                placeholder="Type a quick question..."
                disabled={isLoading}
                className="border-border/80 bg-background/90 flex-1 rounded-lg border px-3 py-2 text-sm transition-colors outline-none focus:border-violet-500/40 disabled:opacity-50"
              />
              <Button size="icon-sm" variant="gradient" onClick={handleSend} disabled={isLoading || !input.trim()}>
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
