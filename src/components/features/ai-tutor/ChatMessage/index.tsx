'use client';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Brain, User } from 'lucide-react';
import type { ChatMessage as ChatMessageType } from '@/types';
import { cn } from '@/lib/utils/cn';

export function ChatMessage({ message }: { message: ChatMessageType }) {
  const isUser = message.role === 'user';
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cn('flex gap-3', isUser && 'flex-row-reverse')}>
      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
        isUser ? 'bg-secondary' : 'bg-gradient-to-br from-violet-500 to-indigo-600')}>
        {isUser ? <User className="w-4 h-4" /> : <Brain className="w-4 h-4 text-white" />}
      </div>
      <div className={cn('max-w-[80%] rounded-2xl px-4 py-3 text-sm', isUser ? 'bg-primary text-primary-foreground' : 'glass border border-border/50')}>
        {message.content ? (
          <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-muted prose-pre:text-xs">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
          </div>
        ) : (
          <span className="text-muted-foreground">...</span>
        )}
      </div>
    </motion.div>
  );
}
