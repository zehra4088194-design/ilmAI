'use client';
import { isValidElement, useMemo, useState, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { ThumbsUp, ThumbsDown, Sparkles, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { toast } from 'sonner';
import { ChartBlock, parseSpec as parseChartSpec } from '@/components/features/ai/ChartBlock';
import { normalizeLatexDelimiters } from '@/lib/utils/normalizeLatexDelimiters';
import { HANDWRITTEN_PALETTE } from '@/lib/constants/handwriting';

// Flattens a react-markdown paragraph's children back to plain text, so the "Final Answer"
// paragraph (see MARKDOWN_ANSWER_FORMAT_INSTRUCTION — every worked numerical ends with one,
// often carrying its boxed $$\boxed{...}$$ result on the same line) can be recognized regardless
// of the bold/math elements inside it, and rendered as a celebratory highlight instead of a plain
// paragraph — the "whiteboard, step-by-step, boxed final answer" look for ANY subject, not just
// a hardcoded math template.
function flattenToText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenToText).join('');
  if (isValidElement(node)) return flattenToText((node.props as { children?: ReactNode })?.children);
  return '';
}

// A small handwritten-marker note on the Final Answer card, like a teacher's tick on a whiteboard
// — purely decorative (the actual answer text stays in the normal font, fully legible). Picked
// from a hash of the answer text itself, not Math.random(), so it stays put across re-renders —
// including every re-render while a streamed answer is still arriving character by character.
const WELL_DONE_NOTES = ['Well done!', 'Nicely solved!', 'Great work!', "That's it!", 'Spot on!'];

function pickWellDoneNote(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) hash = (hash * 31 + content.charCodeAt(i)) | 0;
  return WELL_DONE_NOTES[Math.abs(hash) % WELL_DONE_NOTES.length] ?? 'Well done!';
}

// Section headings (the ai-doc-body h3 rule below) get a bit of variety instead of every answer
// looking identical — a colour from the same small "pretty" palette Notes uses for its handwritten
// style, plus one of two handwriting faces, both picked from a hash of the heading text so a given
// heading stays the same colour/font across re-renders (including a streamed answer still
// arriving). `!` forces the Tailwind colour past .ai-doc-body h3's own `color` rule in globals.css,
// which otherwise wins on selector specificity alone.
function pickHeadingStyle(heading: string) {
  let hash = 0;
  for (let i = 0; i < heading.length; i++) hash = (hash * 31 + heading.charCodeAt(i)) | 0;
  const tone = HANDWRITTEN_PALETTE[Math.abs(hash) % HANDWRITTEN_PALETTE.length]!;
  const font = hash % 2 === 0 ? 'font-handwritten' : 'font-handwritten-alt';
  return `${font} ${tone.important}`;
}

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
 * Use this everywhere a longer AI explanation is shown to a student. Pass
 * card={false} when a chat bubble already provides the visual container.
 */
export function AiAnswerRenderer({ content, className, card = true, label, feedback }: AiAnswerRendererProps) {
  const [voted, setVoted] = useState<'up' | 'down' | null>(null);
  const normalizedContent = useMemo(() => normalizeLatexDelimiters(content), [content]);

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
      toast.success(isHelpful ? 'Thank you. We are glad this helped.' : 'Feedback received. We will use it to improve.');
    } catch {
      // Non-fatal — feedback is a nice-to-have, don't block the reading experience
    }
  };

  const body = (
    <div className={cn('ai-doc-body prose prose-sm dark:prose-invert max-w-none overflow-x-auto', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, { strict: false }]]}
        components={{
          a: ({ href, children, ...props }) => (
            <a
              href={href}
              {...props}
              className="not-prose my-1 inline-flex items-center rounded-lg border border-primary/35 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary no-underline transition-colors hover:bg-primary/20"
            >
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="not-prose my-3 overflow-x-auto rounded-xl border border-border/70">
              <table className="w-full text-left text-sm">{children}</table>
            </div>
          ),
          h3: ({ children }) => <h3 className={pickHeadingStyle(flattenToText(children))}>{children}</h3>,
          // A paragraph starting with "Final Answer" (the AI always ends a worked numerical this
          // way, boxed result and all — see MARKDOWN_ANSWER_FORMAT_INSTRUCTION) gets the
          // "well done!" whiteboard treatment instead of a plain line: a green highlighted card
          // with a checkmark, same idea for math, physics, chemistry, biology — any subject.
          p: ({ children }) => {
            if (/^final answer\b/i.test(flattenToText(children).trim())) {
              return (
                <div className="not-prose ai-final-answer my-3 flex items-start justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <p className="m-0 text-sm leading-relaxed font-semibold text-emerald-800 dark:text-emerald-300">{children}</p>
                  </div>
                  <span className="ai-well-done hidden shrink-0 -rotate-6 text-lg text-emerald-600 sm:inline-block dark:text-emerald-400">
                    {pickWellDoneNote(normalizedContent)}
                  </span>
                </div>
              );
            }
            return <p>{children}</p>;
          },
          // A ```chart fenced block (JSON spec — see ChartBlock's doc comment) renders as an
          // actual graph instead of a code block. A ```json or unlabeled block whose content
          // still parses as a valid chart spec is also rendered as a chart — a smaller/free-tier
          // model sometimes has the right data but forgets the exact "chart" tag. Anything else
          // (or a malformed/placeholder spec) falls through to the default <pre><code> rendering.
          pre: ({ children }) => {
            const codeElement = Array.isArray(children) ? children[0] : children;
            const codeProps = (codeElement as { props?: { className?: string; children?: unknown } })?.props;
            const language = /language-(\w+)/.exec(codeProps?.className || '')?.[1];
            if (language === 'chart' || language === 'json' || !language) {
              const raw = Array.isArray(codeProps?.children) ? codeProps.children.join('') : String(codeProps?.children ?? '');
              const trimmed = raw.replace(/\n$/, '');
              if (language === 'chart') return <ChartBlock spec={trimmed} />;
              if (parseChartSpec(trimmed)) return <ChartBlock spec={trimmed} />;
            }
            return <pre>{children}</pre>;
          },
        }}
      >
        {normalizedContent}
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
          <span className="text-xs text-muted-foreground">Was this helpful?</span>
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
            <ThumbsUp className="w-3.5 h-3.5" /> Yes
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
            <ThumbsDown className="w-3.5 h-3.5" /> No
          </button>
        </div>
      )}
    </div>
  );
}
