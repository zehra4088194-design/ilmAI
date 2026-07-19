'use client';
import { Plus, MessageSquare, Trash2 } from 'lucide-react';
import { useChatStore } from '@/store/chat.store';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import { formatRelativeTime } from '@/lib/utils/format';

export function ConversationSidebar({ onNavigate }: { onNavigate?: () => void } = {}) {
  const { conversations, activeConversationId, createConversation, setActiveConversation, deleteConversation } = useChatStore();
  return (
    <div className="flex flex-col h-full">
      <div className="p-4">
        <Button
          variant="gradient"
          className="w-full"
          onClick={() => {
            createConversation();
            onNavigate?.();
          }}
        >
          <Plus className="w-4 h-4" />New Chat
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto px-2 space-y-1">
        {conversations.map((conv) => (
          <div key={conv.id} onClick={() => { setActiveConversation(conv.id); onNavigate?.(); }}
            className={cn('group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors', activeConversationId === conv.id ? 'bg-accent' : 'hover:bg-accent/50')}>
            <MessageSquare className="w-4 h-4 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate">{conv.title}</p>
              <p className="text-xs text-muted-foreground">{formatRelativeTime(conv.updatedAt)}</p>
            </div>
            <button onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        {conversations.length === 0 && <p className="text-xs text-muted-foreground text-center py-8">Koi conversation nahi hai abhi</p>}
      </div>
    </div>
  );
}
