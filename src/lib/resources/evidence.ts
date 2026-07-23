export type ResourceEvidence = {
  title: string;
  excerpt: string;
  confidence: number;
  pageReference: string;
};

export function buildResourceEvidence(title: string, context: string, confidence = 88): ResourceEvidence {
  const compact = context.replace(/\s+/g, ' ').trim();
  const pageMatch =
    context.match(/(?:^|\n)\s*(?:page|p\.?)\s*[:#-]?\s*(\d{1,4})\b/i) ||
    context.match(/\f\s*(?:page\s*)?(\d{1,4})?/i);
  return {
    title,
    excerpt: compact.slice(0, 420),
    confidence,
    pageReference: pageMatch?.[1] ? `Page ${pageMatch[1]}` : 'Extracted source context; exact page marker not available',
  };
}

export function buildResourceEvidenceFromChunk(
  title: string,
  chunk: { content: string; page_number?: number | null; metadata?: unknown },
  confidence = 92
): ResourceEvidence {
  const compact = chunk.content.replace(/\s+/g, ' ').trim();
  return {
    title,
    excerpt: compact.slice(0, 420),
    confidence,
    pageReference: chunk.page_number ? `Page ${chunk.page_number}` : 'Stored source chunk; exact page marker not available',
  };
}

export function verifiedSourceInstruction() {
  return [
    'Use only the supplied source text.',
    'If the source text does not contain the answer, say: "This source does not contain enough evidence for that answer."',
    'Do not guess, invent page numbers, or add outside facts.',
    'Mention source confidence and page/reference information when available.',
  ].join(' ');
}
