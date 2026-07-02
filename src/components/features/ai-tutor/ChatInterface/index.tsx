'use client';
import { useState, useRef, useEffect } from 'react';
import { useChatStore } from '@/store/chat.store';
import { ChatMessage } from '@/components/features/ai-tutor/ChatMessage';
import { ChatInput } from '@/components/features/ai-tutor/ChatInput';
import { TypingIndicator } from '@/components/features/ai-tutor/TypingIndicator';
import { SuggestionChips } from '@/components/features/ai-tutor/SuggestionChips';
import { ConversationSidebar } from '@/components/features/ai-tutor/ConversationSidebar';
import { AIProviderSelector } from '@/components/features/ai-selector/AIProviderSelector';
import { Brain, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/auth/useAuth';
import type { AiProviderId, ModelTier } from '@/lib/ai/gateway';
import { toast } from 'sonner';

export function ChatInterface() {
  const { activeConversationId, conversations, createConversation, addMessage, updateLastMessage, isStreaming, setStreaming } = useChatStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [provider, setProvider] = useState<AiProviderId>('groq');
  const [tier, setTier] = useState<ModelTier>('mini');
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const isFreeTier = !user || user.subscriptionTier === 'FREE';

  const activeConversation = conversations.find(c => c.id === activeConversationId);
  const messages = activeConversation?.messages || [];

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
        body: JSON.stringify({ message: text, conversationId: convId, history: messages.slice(-10), provider, tier }),
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

  return (
    <div className="flex h-full">
      <div className="hidden lg:block w-72 border-r border-border shrink-0">
        <ConversationSidebar />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <Button variant="ghost" size="icon-sm" className="lg:hidden" onClick={() => setSidebarOpen(true)}><Menu className="w-4 h-4" /></Button>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm">AI Tutor</p>
            <p className="text-xs text-muted-foreground">{isStreaming ? 'Typing...' : 'Online · Ready to help'}</p>
          </div>
          <AIProviderSelector provider={provider} tier={tier} onChange={(p, t) => { setProvider(p); setTier(t); }} isFreeTier={isFreeTier} compact />
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mb-4">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-bold mb-2">AI Tutor Se Pucho!</h2>
              <p className="text-muted-foreground text-sm mb-6 max-w-sm">Koi bhi sawal pucho - Physics, Chemistry, Math, ya kuch bhi. Photo bhi scan kar sakte ho!</p>
              <SuggestionChips onSelect={handleSend} />
            </div>
          ) : (
            <>
              {messages.map((msg) => <ChatMessage key={msg.id} message={msg} />)}
              {isStreaming && messages[messages.length - 1]?.content === '' && <TypingIndicator />}
            </>
          )}
          <div ref={scrollRef} />
        </div>

        {/* Input */}
        <ChatInput onSend={handleSend} disabled={isStreaming} />
      </div>
    </div>
  );
}
