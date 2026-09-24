'use client';
import { motion } from 'framer-motion';
import { User } from 'lucide-react';
import type { ChatMessage as ChatMessageType } from '@/types';
import { cn } from '@/lib/utils/cn';
import { AiAnswerRenderer } from '@/components/features/ai/AiAnswerRenderer';
import { TeacherIdentityCard } from '@/components/features/teacher/TeacherIdentityCard';

interface ChatMessageProps {
  message: ChatMessageType & { id?: string };
  subject?: string | null;
}

export function ChatMessage({ message, subject }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cn('flex gap-3', isUser && 'flex-row-reverse')}>
      {isUser ? (
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-secondary">
          <User className="w-4 h-4" />
        </div>
      ) : (
        <TeacherIdentityCard subjectName={subject} avatarOnly size="md" />
      )}

      <div className={cn('max-w-[85%] sm:max-w-[80%]', isUser && 'flex flex-col items-end')}>
        {!isUser && message.content && (
          <p className="text-xs font-medium text-muted-foreground mb-1 ml-0.5">
            {subject ? `${subject} Tutor` : 'ilm AI Tutor'}
          </p>
        )}
        <div className={cn('rounded-2xl text-sm', isUser ? 'bg-primary text-primary-foreground px-4 py-3' : '')}>
          {message.content ? (
            isUser ? (
              <span className="whitespace-pre-wrap">{message.content}</span>
            ) : (
              <AiAnswerRenderer
                content={message.content}
                card
                feedback={message.id ? { sourceType: 'ai_tutor_message', sourceId: message.id } : undefined}
              />
            )
          ) : (
            <span className="text-muted-foreground px-4 py-3 inline-block">...</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
