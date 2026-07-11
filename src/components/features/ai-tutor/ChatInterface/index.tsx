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
import { Menu } from 'lucide-react';
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
  }, [messages]);

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
      toast.error(error instanceof Error ? error.message : 'Kuch ghalat ho gaya');
      updateLastMessage('Sorry, kuch error aa gaya. Dobara try karo.');
    } finally {
      setStreaming(false);
    }
  };

  const showSubjectPicker = !subjectPicked && messages.length === 0 && subjects.length > 0;

  return (
    <div className="flex h-full">
      <div className="hidden lg:block w-72 border-r border-border shrink-0">
        <ConversationSidebar />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <Button variant="ghost" size="icon-sm" className="lg:hidden" onClick={() => setSidebarOpen(true)}><Menu className="w-4 h-4" /></Button>
          <TeacherIdentityCard subjectName={subject?.name} size="md" className="flex-1" />
          <LiveVoiceCall subject={subject?.name} hasAccess={hasLiveVoiceAccess} />
          <AIProviderSelector provider={provider} tier={tier} onChange={(p, t) => { setProvider(p); setTier(t); }} isFreeTier={isFreeTier} userTier={user?.subscriptionTier || 'FREE'} compact />
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {showSubjectPicker ? (
            <SubjectPicker
              subjects={subjects}
              onSelect={(s) => { setSubject(s); setSubjectPicked(true); }}
            />
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              <TeacherIdentityCard subjectName={subject?.name} size="lg" className="flex-col text-center mb-4 [&>div:last-child]:mt-2" />
              <h2 className="text-xl font-bold mb-2">AI Tutor Se Puchho!</h2>
              <p className="text-muted-foreground text-sm mb-6 max-w-sm">Koi bhi sawal puchho - Physics, Chemistry, Math, ya kuch bhi. Photo bhi scan kar sakte ho! Ya phir Voice Call se seedha baat karo.</p>
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
          <div className="border-t border-border bg-background/80">
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
