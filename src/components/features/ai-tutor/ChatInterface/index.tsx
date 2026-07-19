'use client';
import { useState, useRef, useEffect } from 'react';
import { useChatStore } from '@/store/chat.store';
import { ChatMessage } from '@/components/features/ai-tutor/ChatMessage';
import { ChatInput } from '@/components/features/ai-tutor/ChatInput';
import { TypingIndicator } from '@/components/features/ai-tutor/TypingIndicator';
import { SuggestionChips } from '@/components/features/ai-tutor/SuggestionChips';
import { ConversationSidebar } from '@/components/features/ai-tutor/ConversationSidebar';
import { SubjectPicker } from '@/components/features/ai-tutor/SubjectPicker';
import { LiveVoiceCall } from '@/components/features/ai-tutor/LiveVoiceCall';
import { MotivationCarousel } from '@/components/features/ai-tutor/MotivationCarousel';
import { TeacherIdentityCard } from '@/components/features/teacher/TeacherIdentityCard';
import { AIProviderSelector } from '@/components/features/ai-selector/AIProviderSelector';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/auth/useAuth';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import type { AiProviderId, ModelTier } from '@/lib/ai/gateway';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

export function ChatInterface() {
  const { activeConversationId, conversations, createConversation, addMessage, updateLastMessage, isStreaming, setStreaming } = useChatStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [provider, setProvider] = useState<AiProviderId>('groq');
  const [tier, setTier] = useState<ModelTier>('mini');
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [subject, setSubject] = useState<{ id: string; name: string } | null>(null);
  const [subjectPicked, setSubjectPicked] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { user } = useAuth();
  const settings = usePlatformSettings();
  const userTier = user?.subscriptionTier || 'FREE';
  const isFreeTier = !user || user.subscriptionTier === 'FREE';
  const hasLiveVoiceAccess = !!user && settings.subscriptionPlans[userTier].access.liveVoice;

  const activeConversation = conversations.find(c => c.id === activeConversationId);
  const messages = activeConversation?.messages || [];

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, messages.at(-1)?.content]);

  useEffect(() => {
    if (!sidebarOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSidebarOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [sidebarOpen]);

  useEffect(() => {
    const supabase = createClient();
    let query = supabase.from('subjects').select('id, name').eq('is_active', true).order('name');
    if (user?.board) query = query.contains('boards', [user.board]);
    if (user?.gradeLevel) query = query.contains('grade_levels', [user.gradeLevel]);
    query.then(({ data }) => {
      if (data) setSubjects(data);
    });
  }, [user?.board, user?.gradeLevel]);

  const handleSend = async (text: string) => {
    let convId = activeConversationId;
    if (!convId) convId = createConversation();

    addMessage({ role: 'user', content: text });
    addMessage({ role: 'assistant', content: '' });
    setStreaming(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, conversationId: convId, history: messages.slice(-10), provider, tier, subject: subject?.name, source: 'ai_tutor' }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to get response');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          fullText += chunk;
          updateLastMessage(fullText);
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Something went wrong.');
      updateLastMessage('Sorry, something went wrong. Please try again.');
    } finally {
      setStreaming(false);
    }
  };

  const showSubjectPicker = !subjectPicked && messages.length === 0 && subjects.length > 0;

  return (
    <div className="bg-background relative flex h-full min-h-0 min-w-0 overflow-hidden">
      <div className="border-border hidden w-72 shrink-0 border-r lg:block">
        <ConversationSidebar />
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-[140] lg:hidden" role="dialog" aria-modal="true" aria-label="Chat history">
          <button
            type="button"
            className="absolute inset-0 bg-black/65 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close chat history"
          />
          <aside className="bg-background border-border relative flex h-dvh w-72 max-w-[86vw] flex-col border-r shadow-2xl">
            <div className="border-border flex min-h-14 items-center justify-between border-b px-4">
              <p className="font-semibold">Chat history</p>
              <Button variant="ghost" size="icon-sm" onClick={() => setSidebarOpen(false)} aria-label="Close chat history">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="min-h-0 flex-1">
              <ConversationSidebar onNavigate={() => setSidebarOpen(false)} />
            </div>
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <div className="border-border flex min-h-14 min-w-0 items-center gap-2 border-b px-2 py-2 sm:gap-3 sm:px-4">
          <Button variant="ghost" size="icon-sm" className="shrink-0 lg:hidden" onClick={() => setSidebarOpen(true)} aria-label="Open chat history"><Menu className="h-4 w-4" /></Button>
          <TeacherIdentityCard subjectName={subject?.name} size="md" className="min-w-0 flex-1" />
          <div className="hidden shrink-0 md:block">
            <LiveVoiceCall subject={subject?.name} hasAccess={hasLiveVoiceAccess} userTier={userTier} />
          </div>
          <div className="shrink-0">
            <AIProviderSelector provider={provider} tier={tier} onChange={(p, t) => { setProvider(p); setTier(t); }} isFreeTier={isFreeTier} userTier={user?.subscriptionTier || 'FREE'} compact />
          </div>
        </div>

        {/* Messages */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-3 sm:p-4">
          {showSubjectPicker ? (
            <SubjectPicker
              subjects={subjects}
              onSelect={(s) => { setSubject(s); setSubjectPicked(true); }}
            />
          ) : messages.length === 0 ? (
            <div className="flex min-h-full flex-col items-center justify-center px-2 py-6 text-center sm:px-4">
              <TeacherIdentityCard subjectName={subject?.name} size="lg" className="flex-col text-center mb-4 [&>div:last-child]:mt-2" />
              <h2 className="text-xl font-bold mb-2">Ask AI Tutor</h2>
              <p className="text-muted-foreground text-sm mb-6 max-w-sm">Ask anything about Physics, Chemistry, Math, or another subject. Scan a photo or start a voice call.</p>
              <SuggestionChips
                subjectName={subject?.name}
                onSelect={(prompt) => {
                  setInputValue(prompt);
                  inputRef.current?.focus();
                }}
              />
            </div>
          ) : (
            <>
              {messages.map((msg) => <ChatMessage key={msg.id} message={msg} subject={subject?.name} />)}
              {isStreaming && messages[messages.length - 1]?.content === '' && <TypingIndicator />}
            </>
          )}
          <div ref={scrollRef} />
        </div>

        {/* Input */}
        {!showSubjectPicker && (
          <div className="border-border bg-background/95 shrink-0 border-t backdrop-blur">
            <MotivationCarousel subjectName={subject?.name} />
            <ChatInput
              onSend={handleSend}
              disabled={isStreaming}
              value={inputValue}
              onChange={setInputValue}
              textareaRef={inputRef}
            />
          </div>
        )}
      </div>
    </div>
  );
}
