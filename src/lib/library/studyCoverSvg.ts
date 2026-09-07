// Reusable, automatically-generated A4-ratio SVG cover for any study PDF (MCQs / Short Questions
// / Long Questions / Notes / Solved Examples), used two places: (1) as the product image when a
// library resource is auto-turned into a printed-notes product on the store (see
// order-notes/route.ts and lib/library/notesProductSync.ts), and (2) reusable later as the actual
// front page of the printed PDF itself. One design system, driven entirely by structured metadata
// (class/subject/chapter/content type) — never a manually-designed one-off per subject or file.
//
// Deliberately vector (SVG string, not a rasterized PNG) — scales cleanly from a small product
// card thumbnail up to a full A4 printable page with no quality loss, and is small enough to send
// as-is to the store's internal product-sync endpoint.

export type ContentType =
  | 'MCQS'
  | 'SHORT_QUESTIONS'
  | 'LONG_QUESTIONS'
  | 'NOTES'
  | 'SOLVED_EXAMPLES'
  | 'OTHER';

const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  MCQS: 'MCQs',
  SHORT_QUESTIONS: 'Short Questions',
  LONG_QUESTIONS: 'Long Questions',
  NOTES: 'Notes',
  SOLVED_EXAMPLES: 'Solved Examples',
  OTHER: '',
};

/**
 * Structured fields win; title parsing is only ever a fallback for whatever they can't answer —
 * see chapter-question-bank.ts / order-notes/route.ts for where the structured values come from
 * (library_resources.content_section, resource_type) before this is ever reached.
 */
export function resolveContentType(input: {
  contentSection?: string | null;
  resourceType?: string | null;
  title?: string | null;
}): ContentType {
  const section = (input.contentSection || '').toLowerCase();
  if (section === 'mcq') return 'MCQS';
  if (section === 'short') return 'SHORT_QUESTIONS';
  if (section === 'long') return 'LONG_QUESTIONS';
  if (input.resourceType === 'notes') return 'NOTES';

  const title = (input.title || '').toLowerCase();
  if (/\bmcqs?\b/.test(title)) return 'MCQS';
  if (/short\s*questions?/.test(title)) return 'SHORT_QUESTIONS';
  if (/long\s*questions?/.test(title)) return 'LONG_QUESTIONS';
  if (/(solved\s*)?examples?/.test(title)) return 'SOLVED_EXAMPLES';
  if (/notes?/.test(title)) return 'NOTES';
  return 'OTHER';
}

/** "GRADE_9" -> "9", already-plain "9"/"Grade 9" pass through unchanged. */
export function formatClassLabel(gradeLevel?: string | null): string {
  if (!gradeLevel) return '';
  const match = gradeLevel.match(/(\d+)/);
  return match?.[1] || gradeLevel.replace(/_/g, ' ');
}

type SubjectMotif = 'physics' | 'chemistry' | 'biology' | 'math' | 'english' | 'computer_science' | 'general';

function resolveMotif(subject?: string | null): SubjectMotif {
  const s = (subject || '').toLowerCase();
  if (s.includes('physic')) return 'physics';
  if (s.includes('chem')) return 'chemistry';
  if (s.includes('bio')) return 'biology';
  if (s.includes('math')) return 'math';
  if (s.includes('english') || s.includes('urdu') || s.includes('literat')) return 'english';
  if (s.includes('computer') || s.includes('ict') || s.includes('programming')) return 'computer_science';
  return 'general';
}

// Every motif is just a handful of thin, low-opacity teal/gold strokes — decoration, never
// competing with the text for attention (per the "subtle, never interfere with readability" rule).
function motifLayer(motif: SubjectMotif): string {
  const teal = 'rgba(45,212,191,0.16)';
  const gold = 'rgba(212,175,55,0.14)';
  switch (motif) {
    case 'physics':
      return `
        <circle cx="620" cy="230" r="70" fill="none" stroke="${teal}" stroke-width="1.5"/>
        <ellipse cx="620" cy="230" rx="120" ry="42" fill="none" stroke="${teal}" stroke-width="1.5" transform="rotate(-20 620 230)"/>
        <ellipse cx="620" cy="230" rx="120" ry="42" fill="none" stroke="${gold}" stroke-width="1.5" transform="rotate(35 620 230)"/>
        <circle cx="620" cy="230" r="6" fill="${teal}"/>`;
    case 'chemistry':
      return `
        <g fill="none" stroke="${teal}" stroke-width="1.5">
          <path d="M560 180 L610 210 L610 260 L560 290 L510 260 L510 210 Z"/>
          <path d="M640 250 L680 275 L680 320 L640 345 L600 320 L600 275 Z" stroke="${gold}"/>
        </g>
        <circle cx="560" cy="180" r="4" fill="${teal}"/>
        <circle cx="640" cy="250" r="4" fill="${gold}"/>`;
    case 'biology':
      return `
        <path d="M540 180 C 620 200, 620 260, 540 280 C 620 300, 620 360, 540 380" fill="none" stroke="${teal}" stroke-width="2"/>
        <path d="M700 180 C 620 200, 620 260, 700 280 C 620 300, 620 360, 700 380" fill="none" stroke="${gold}" stroke-width="2"/>`;
    case 'math':
      return `
        <g fill="none" stroke="${teal}" stroke-width="1.2">
          <line x1="500" y1="330" x2="700" y2="330"/>
          <line x1="520" y1="180" x2="520" y2="340"/>
          <path d="M520 300 L580 220 L640 270 L700 190" stroke="${gold}" stroke-width="1.8"/>
        </g>`;
    case 'english':
      return `
        <text x="560" y="290" font-family="Georgia, serif" font-size="140" fill="${teal}" opacity="0.5">&#8220;</text>
        <line x1="540" y1="330" x2="700" y2="330" stroke="${gold}" stroke-width="1.5"/>`;
    case 'computer_science':
      return `
        <g fill="none" stroke="${teal}" stroke-width="1.4">
          <rect x="530" y="190" width="160" height="110" rx="10"/>
          <line x1="555" y1="215" x2="600" y2="215"/>
          <line x1="555" y1="235" x2="640" y2="235"/>
          <line x1="555" y1="255" x2="615" y2="255" stroke="${gold}"/>
        </g>`;
    default:
      return `
        <circle cx="620" cy="240" r="90" fill="none" stroke="${teal}" stroke-width="1.5"/>
        <circle cx="620" cy="240" r="60" fill="none" stroke="${gold}" stroke-width="1.2"/>`;
  }
}

// SVG <text> never wraps on its own — a simple char-count-based wrap keeps a long chapter title
// from ever running off the safe-print area or overlapping the content-type badge below it.
function wrapLines(text: string, maxCharsPerLine: number, maxLines: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxCharsPerLine && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
    if (lines.length === maxLines - 1 && current.length > maxCharsPerLine) break;
  }
  if (current) lines.push(current);
  if (lines.length > maxLines) {
    const truncated = lines.slice(0, maxLines);
    const last = truncated[maxLines - 1];
    if (last) truncated[maxLines - 1] = `${last.replace(/\s+\S*$/, '')}…`;
    return truncated;
  }
  return lines;
}

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export interface StudyCoverInput {
  className?: string | null; // "9", "GRADE_9", "Grade 9" — all accepted, see formatClassLabel
  subject?: string | null;
  chapterNumber?: number | string | null;
  chapterName?: string | null;
  contentType: ContentType;
  brandName?: string;
  website?: string;
}

/** A4 portrait ratio (210×297mm) at a clean 794×1123 web/print-friendly pixel size. */
export function generateStudyCoverSvg(input: StudyCoverInput): string {
  const brand = input.brandName || 'ILM AI STUDY';
  const website = input.website || 'www.ilmai.study';
  const classLabel = formatClassLabel(input.className);
  const subject = (input.subject || '').trim();
  const chapterNumber = input.chapterNumber != null && input.chapterNumber !== '' ? String(input.chapterNumber) : '';
  const chapterTitle = (input.chapterName || '').trim();
  const contentLabel = CONTENT_TYPE_LABELS[input.contentType] || '';
  const motif = resolveMotif(subject);

  const titleLines = chapterTitle ? wrapLines(chapterTitle.toUpperCase(), 22, 2) : [];

  return `<svg width="794" height="1123" viewBox="0 0 794 1123" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0d1117"/>
      <stop offset="100%" stop-color="#05070a"/>
    </linearGradient>
    <linearGradient id="badge" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#2dd4bf"/>
      <stop offset="100%" stop-color="#0d9488"/>
    </linearGradient>
  </defs>

  <rect width="794" height="1123" fill="url(#bg)"/>
  <!-- Safe-print border, well inside the physical trim edge -->
  <rect x="28" y="28" width="738" height="1067" fill="none" stroke="rgba(212,175,55,0.35)" stroke-width="1.5"/>

  <g opacity="0.9">${motifLayer(motif)}</g>

  <!-- Brand header -->
  <text x="397" y="110" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="22"
        letter-spacing="6" fill="#d4af37" font-weight="700">${escapeXml(brand)}</text>
  <line x1="317" y1="128" x2="477" y2="128" stroke="#d4af37" stroke-width="1" opacity="0.6"/>

  <!-- Class -->
  ${
    classLabel
      ? `<text x="397" y="260" text-anchor="middle" font-family="Arial, sans-serif" font-size="80" font-weight="800" fill="#f5f5f5" letter-spacing="2">CLASS ${escapeXml(classLabel)}</text>`
      : ''
  }

  <!-- Subject -->
  ${
    subject
      ? `<text x="397" y="345" text-anchor="middle" font-family="Arial, sans-serif" font-size="52" font-weight="700" fill="#2dd4bf" letter-spacing="3">${escapeXml(subject.toUpperCase())}</text>`
      : ''
  }

  <!-- Chapter number -->
  ${
    chapterNumber
      ? `<text x="397" y="410" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" font-weight="600" fill="#9ca3af" letter-spacing="4">CHAPTER ${escapeXml(chapterNumber)}</text>`
      : ''
  }

  <!-- Chapter title (wrapped, up to 2 lines) -->
  ${titleLines
    .map(
      (line, index) =>
        `<text x="397" y="${460 + index * 46}" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#f5f5f5">${escapeXml(line)}</text>`
    )
    .join('\n  ')}

  <!-- Content-type badge -->
  ${
    contentLabel
      ? `<g transform="translate(397 ${560 + titleLines.length * 20})">
    <rect x="-140" y="-28" width="280" height="56" rx="28" fill="url(#badge)"/>
    <text x="0" y="9" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" font-weight="800" fill="#05070a" letter-spacing="1">${escapeXml(contentLabel.toUpperCase())}</text>
  </g>`
      : ''
  }

  <!-- Footer branding -->
  <line x1="297" y1="1030" x2="497" y2="1030" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>
  <text x="397" y="1058" text-anchor="middle" font-family="Arial, sans-serif" font-size="15" letter-spacing="3" fill="#9ca3af">SMART EXAM PREPARATION</text>
  <text x="397" y="1082" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#d4af37">${escapeXml(website)}</text>
</svg>`;
}
