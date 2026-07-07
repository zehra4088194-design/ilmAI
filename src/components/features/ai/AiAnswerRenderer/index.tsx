'use client';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { ThumbsUp, ThumbsDown, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { toast } from 'sonner';

// Import once, globally, from src/app/layout.tsx: import 'katex/dist/katex.min.css';

export type AiFeedbackSource =
  | 'doubt_reply'
  | 'ai_tutor_message'
  | 'quiz_explanation'
  | 'full_test_feedback'
  | 'routine_explanation'
  | 'guess_paper_explanation';

interface AiAnswerRendererProps {
  content: string;
  className?: string;
  /** Wrap in the bordered "document" card. Turn off when the parent (e.g. a chat
   *  bubble) already provides its own container and only the markdown body is needed. */
  card?: boolean;
  /** Small label shown above the answer, e.g. "Sir Zafar's Answer" or "Explanation". */
  label?: string;
  /** When provided, renders a "was this helpful" thumbs control that POSTs to /api/ai-feedback. */
  feedback?: { sourceType: AiFeedbackSource; sourceId: string };
}

/**
 * Renders an AI-generated answer as a structured "document" — real headings,
 * numbered steps, tables, code blocks and LaTeX — instead of a flat wall of text.
 * Use this everywhere a longer AI explanation is shown to a student EXCEPT the
 * floating site-wide quick-chat widget, which intentionally stays plain-text chat.
 */
export function AiAnswerRenderer({ content, className, card = true, label, feedback }: AiAnswerRendererProps) {
  const [voted, setVoted] = useState<'up' | 'down' | null>(null);

  const submitFeedback = async (isHelpful: boolean) => {
    if (!feedback || voted) return;
    setVoted(isHelpful ? 'up' : 'down');
    try {
      const res = await fetch('/api/ai-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceType: feedback.sourceType, sourceId: feedback.sourceId, isHelpful }),
      });
      const json = await res.json();
      if (json.status === 'error') throw new Error(json.error);
      toast.success(isHelpful ? 'Shukriya! Khushi hui madad kar ke 🎉' : 'Feedback mil gaya, hum behtar karenge');
    } catch {
      // Non-fatal — feedback is a nice-to-have, don't block the reading experience
    }
  };

  const body = (
    <div className={cn('ai-doc-body prose prose-sm dark:prose-invert max-w-none', className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
        {content}
      </ReactMarkdown>
    </div>
  );

  if (!card) return body;

  return (
    <div className="ai-doc p-4 sm:p-5">
      {label && (
        <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-violet-500 dark:text-violet-400">
          <Sparkles className="w-3.5 h-3.5" />
          {label}
        </div>
      )}
      {body}
      {feedback && (
        <div className="flex items-center gap-3 mt-4 pt-3 border-t border-border/60">
          <span className="text-xs text-muted-foreground">Kya yeh madadgar tha?</span>
          <button
            type="button"
            onClick={() => submitFeedback(true)}
            disabled={!!voted}
            className={cn(
              'inline-flex items-center gap-1 text-xs rounded-full px-2.5 py-1 border transition-colors',
              voted === 'up' ? 'border-green-500/40 bg-green-500/10 text-green-600 dark:text-green-400' : 'border-border hover:bg-muted/50',
              voted && voted !== 'up' && 'opacity-40'
            )}
          >
            <ThumbsUp className="w-3.5 h-3.5" /> Haan
          </button>
          <button
            type="button"
            onClick={() => submitFeedback(false)}
            disabled={!!voted}
            className={cn(
              'inline-flex items-center gap-1 text-xs rounded-full px-2.5 py-1 border transition-colors',
              voted === 'down' ? 'border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400' : 'border-border hover:bg-muted/50',
              voted && voted !== 'down' && 'opacity-40'
            )}
          >
            <ThumbsDown className="w-3.5 h-3.5" /> Nahi
          </button>
        </div>
      )}
    </div>
  );
}
