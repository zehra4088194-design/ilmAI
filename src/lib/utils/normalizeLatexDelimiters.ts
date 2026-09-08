// MARKDOWN_ANSWER_FORMAT_INSTRUCTION tells the model to write math with $ / $$ delimiters (the
// only ones remark-math recognizes), but models — especially smaller/free-tier ones — often
// default to LaTeX-native \( \) / \[ \] instead. Left alone, "\[" is valid Markdown escape syntax
// (backslash + punctuation), so the backslash silently disappears before remark-math ever sees
// it, and the raw LaTeX source (\begin{bmatrix}...) spills out as broken plain text instead of a
// rendered formula. Normalizing to $ / $$ here fixes that without depending on model compliance.
// Fenced code blocks are left untouched so real code containing "\(" (e.g. a regex) isn't altered.
// Shared by every ReactMarkdown + remark-math renderer in the app (AiAnswerRenderer for the
// "document" reading UI, InlineMath for compact print/exam-paper contexts) so both stay in sync.
export function normalizeLatexDelimiters(source: string): string {
  return source
    .split(/(```[\s\S]*?```)/g)
    .map((segment, index) =>
      index % 2 === 1
        ? segment // inside a fenced code block — leave untouched
        : segment
            .replace(/\\\[([\s\S]*?)\\\]/g, (_match, inner: string) => `$$${inner}$$`)
            .replace(/\\\(([\s\S]*?)\\\)/g, (_match, inner: string) => `$${inner}$`)
    )
    .join('');
}
