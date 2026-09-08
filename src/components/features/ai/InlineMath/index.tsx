import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { normalizeLatexDelimiters } from '@/lib/utils/normalizeLatexDelimiters';

/**
 * Renders a single line of AI-generated text with LaTeX math ($x^2$, $$...$$, and the \( \)/\[ \]
 * forms normalized to those) — nothing else. Use this instead of <AiAnswerRenderer> in dense,
 * print/PDF-style layouts (exam papers, printable answer keys) where the full "document" renderer's
 * prose/dark-mode/table/chart machinery would fight the sheet's own tight typography, and where the
 * surrounding markup is often already a <p> (ReactMarkdown's own <p> wrapper is stripped here so the
 * output stays inline-safe and never produces invalid nested <p> tags).
 */
export function InlineMath({ text }: { text: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{ p: ({ children }) => <>{children}</> }}
    >
      {normalizeLatexDelimiters(text)}
    </ReactMarkdown>
  );
}
