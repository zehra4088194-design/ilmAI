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
    .map((segment, index) => {
      if (index % 2 === 1) return segment; // inside a fenced code block — leave untouched

      // Normalized paragraph-by-paragraph (split on blank lines), not as one giant string for
      // the whole answer. The $-pairing regex below scans left-to-right for the *next* literal
      // "$" to close each one it opens — one stray/odd "$" anywhere earlier in a long answer
      // (a stray currency sign, a typo, one unclosed inline-math) used to throw off pairing for
      // every paragraph that followed it, silently swallowing entire unrelated paragraphs of
      // plain prose (and any real \begin{}...\end{} in them) into one bogus math span. KaTeX then
      // "rendered" that — collapsing all the prose's spaces (math mode ignores whitespace between
      // ordinary letters) into a run-together italic mess, or erroring out in red on whatever
      // genuine LaTeX got caught up in it. Capping the blast radius to one paragraph means a bad
      // "$" can now only break its own paragraph, never any of the others around it.
      return segment
        .split(/(\n\s*\n)/)
        .map((block) => normalizeBlock(block))
        .join('');
    })
    .join('');
}

function normalizeBlock(block: string): string {
  let normalized = block
    .replace(/\\\[([\s\S]*?)\\\]/g, (_match, inner: string) => `$$${inner}$$`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_match, inner: string) => `$${inner}$`);

  // A model sometimes writes a LaTeX environment (a matrix, "cases", "align", ...) with no
  // $ / $$ delimiters around it at all, as if it were already in math mode. remark-math never
  // recognizes an undelimited \begin{...}...\end{...} as math, so the raw source (e.g.
  // "\begin{bmatrix} a_{11} & ... \end{bmatrix}") leaks out as plain text instead of rendering.
  // Wrap any such environment in $$ — but skip content already inside a $...$/$$...$$ pair
  // (matched first, left untouched) so correctly-delimited math is never double-wrapped.
  normalized = normalized.replace(
    /\$\$[\s\S]*?\$\$|\$[^$\n]*?\$|\\begin\{([a-zA-Z*]+)\}[\s\S]*?\\end\{\1\}/g,
    (whole, envName: string | undefined) => (envName ? `$$${whole}$$` : whole)
  );

  // remark-math only reliably parses "$$...$$" as display math when the delimiters sit on
  // their own line (like a fenced code block) — a "$$" left mid-paragraph (e.g.
  // "...as $$\begin{bmatrix}...$$") can fall through as plain text instead. Force every
  // display-math block onto its own line so it's always recognized.
  normalized = normalized.replace(/\$\$([\s\S]*?)\$\$/g, (_match, inner: string) => `\n\n$$${inner}$$\n\n`);

  return normalized;
}
