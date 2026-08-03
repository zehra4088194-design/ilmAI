import type { FullTestPaper } from '@/app/api/ai/full-test/route';

export type ResourceAnalysis = {
  documentType: string;
  topics: string[];
  detectedSections: string[];
  available: { mcq: number; short: number; long: number };
};

type QuestionCandidate = {
  question: string;
  block: string;
};

type SourceMcq = FullTestPaper['mcqs'][number];

const META_QUESTION_PATTERNS = [
  /\baccording to (?:the )?(?:uploaded |provided |attached )?(?:file|source|document|material|text|notes|passage)\b/i,
  /\bbased on (?:the )?(?:uploaded |provided |attached )?(?:file|source|document|material|text|notes|passage)\b/i,
  /\b(?:uploaded|provided|attached) (?:file|source|document|material|text|notes)\b/i,
  /\b(?:this|the) (?:file|source|document|material|passage) (?:states|mentions|describes|contains|says)\b/i,
  /\bwhich (?:option|statement) is (?:correct|supported) (?:by|according to)\b/i,
];

const VAGUE_QUESTION_PATTERNS = [
  /^what is this\??$/i,
  /^what does this mean\??$/i,
  /^what is (?:mentioned|shown|given|described) (?:above|below|here)\??$/i,
  /^which (?:option|statement|answer) is correct\??$/i,
  /^which of the following is correct\??$/i,
  /^select the correct (?:option|answer|statement)\.?$/i,
];

const GENERIC_OPTION_PATTERNS = [
  /^this statement is not supported/i,
  /^none of the (?:above|options)/i,
  /^all of the above/i,
  /^source point \d+$/i,
];

export function isHighQualitySourceMcq(value: unknown): value is SourceMcq {
  const mcq = value as Partial<SourceMcq> | null;
  const question = String(mcq?.q || '').replace(/\s+/g, ' ').trim();
  const options = Array.isArray(mcq?.opts) ? mcq.opts.map((option) => String(option).replace(/\s+/g, ' ').trim()) : [];
  const correct = Number(mcq?.correct);
  const normalizedOptions = new Set(options.map((option) => option.toLowerCase()));

  return Boolean(
    question.length >= 12 &&
      question.length <= 320 &&
      !META_QUESTION_PATTERNS.some((pattern) => pattern.test(question)) &&
      !VAGUE_QUESTION_PATTERNS.some((pattern) => pattern.test(question)) &&
      options.length === 4 &&
      options.every((option) => option.length >= 1 && option.length <= 240) &&
      options.every((option) => !META_QUESTION_PATTERNS.some((pattern) => pattern.test(option))) &&
      options.every((option) => !GENERIC_OPTION_PATTERNS.some((pattern) => pattern.test(option))) &&
      normalizedOptions.size === 4 &&
      Number.isInteger(correct) &&
      correct >= 0 &&
      correct < options.length
  );
}

export function filterHighQualitySourceMcqs(values: unknown): SourceMcq[] {
  if (!Array.isArray(values)) return [];
  const seen = new Set<string>();
  return values.filter(isHighQualitySourceMcq).filter((mcq) => {
    const key = mcq.q.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const STOP_WORDS = new Set([
  'about',
  'after',
  'again',
  'answer',
  'because',
  'before',
  'being',
  'between',
  'chapter',
  'class',
  'could',
  'describe',
  'explain',
  'from',
  'have',
  'important',
  'into',
  'long',
  'multiple',
  'question',
  'questions',
  'short',
  'should',
  'student',
  'students',
  'their',
  'there',
  'these',
  'they',
  'this',
  'through',
  'using',
  'what',
  'when',
  'where',
  'which',
  'with',
  'would',
]);

function normalizeLine(line: string) {
  return line
    .replace(/^\s*[|]+|[|]+\s*$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function sourceLines(context: string) {
  return context
    .replace(/={3,}\s*Page\s+\d+[^=]*={3,}/gi, '\n')
    .replace(/---\s*Page\s+\d+[^-]*---/gi, '\n')
    .split(/\r?\n/)
    .map(normalizeLine)
    .filter(
      (line) =>
        line.length > 1 &&
        !/^www\./i.test(line) &&
        !/^ILM A[I|l] STUDY$/i.test(line) &&
        !/^Report a mistake/i.test(line) &&
        !/^Want more subject notes/i.test(line)
    );
}

function stripQuestionNumber(line: string) {
  return line
    .replace(/^\s*\/?(?:Q(?:uestion)?\.?\s*)?\d{1,3}\s*[.)|:-]+\s*/i, '')
    .replace(/^\s*\[?\d{1,3}\]?\s+/, '')
    .trim();
}

function isQuestionText(value: string) {
  return (
    value.endsWith('?') ||
    /^(?:what|why|when|where|which|who|how|define|describe|explain|discuss|compare|differentiate|calculate|find|state|write|give|list|name|prove|derive|identify|mention|evaluate)\b/i.test(
      value
    )
  );
}

function extractQuestionCandidates(context: string) {
  const lines = sourceLines(context);
  const starts: number[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (/^\/?(?:Q(?:uestion)?\.?\s*)?\d{1,3}\s*[.)|:-]+\s*\S/i.test(lines[index] || '')) starts.push(index);
  }

  const candidates: QuestionCandidate[] = [];
  for (let index = 0; index < starts.length; index += 1) {
    const start = starts[index]!;
    const end = starts[index + 1] ?? Math.min(lines.length, start + 18);
    const question = stripQuestionNumber(lines[start] || '');
    const block = lines.slice(start, end).join('\n');
    const hasOptions =
      [...block.matchAll(/(?:^|\n|\s)\(?([A-D])\)?[.):]\*?\s*([^\n]+?)(?=(?:\s+\(?[A-D]\)?[.):])|\n|$)/gi)].length >= 4;
    if ((isQuestionText(question) || hasOptions) && question.length >= 8 && question.length <= 500) {
      candidates.push({ question, block });
    }
  }

  return candidates.filter(
    (candidate, index, all) =>
      all.findIndex((item) => item.question.toLowerCase() === candidate.question.toLowerCase()) === index
  );
}

function extractExistingMcqs(context: string) {
  return extractQuestionCandidates(context)
    .map((candidate) => {
      const options = [
        ...candidate.block.matchAll(/(?:^|\n|\s)\(?([A-D])\)?[.):]\*?\s*([^\n]+?)(?=(?:\s+\(?[A-D]\)?[.):])|\n|$)/gi),
      ]
        .map((match) => ({
          letter: match[1]!.toUpperCase(),
          text: match[2]!.trim(),
          marked: /[A-D][.):]\*/i.test(match[0]),
        }))
        .filter((option, index, all) => all.findIndex((item) => item.letter === option.letter) === index)
        .slice(0, 4);
      if (options.length !== 4) return null;
      const explicitAnswer = candidate.block.match(/(?:answer|correct\s+answer)\s*[:=-]?\s*\(?([A-D])\)?/i)?.[1];
      const markedAnswer = options.find((option) => option.marked)?.letter;
      const answerLetter = (explicitAnswer || markedAnswer || '').toUpperCase();
      if (!answerLetter) return null;
      const correct = options.findIndex((option) => option.letter === answerLetter);
      if (correct < 0) return null;
      return {
        q: candidate.question,
        opts: options.map((option) => option.text),
        correct,
        exp: `Option ${answerLetter} is correct: ${options[correct]!.text}.`,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item) && isHighQualitySourceMcq(item));
}

function extractStudyPoints(context: string) {
  const lines = sourceLines(context);
  const points: string[] = [];
  for (const line of lines) {
    const cleaned = line
      .replace(/^\(?[ivxlcdm]+\)?\s*[.)-]\s*/i, '')
      .replace(/^(?:Ans(?:wer)?\.?\s*[:=-]?\s*)/i, '')
      .trim();
    if (
      cleaned.length < 35 ||
      cleaned.length > 280 ||
      isQuestionText(stripQuestionNumber(cleaned)) ||
      /^\(?[A-D]\)?[.):]/i.test(cleaned) ||
      /^(?:multiple choice|short questions?|long questions?|answer key)$/i.test(cleaned)
    ) {
      continue;
    }
    for (const sentence of cleaned.split(/(?<=[.!?])\s+/)) {
      const point = sentence.trim();
      if (point.length < 35 || point.length > 220) continue;
      if (!points.some((item) => item.toLowerCase() === point.toLowerCase())) points.push(point);
    }
  }
  return points;
}

function extractTopics(context: string) {
  const lines = sourceLines(context);
  const topics: string[] = [];
  for (const line of lines.slice(0, 80)) {
    const match = line.match(/(?:unit|chapter)\s*\d+\s*[:=-]\s*([^|]{3,100})/i);
    if (match?.[1]) {
      const topic = match[1].replace(/\b(?:exercise|notes|mcqs?|short questions?|long questions?)\b.*$/i, '').trim();
      if (topic && !topics.some((item) => item.toLowerCase() === topic.toLowerCase())) topics.push(topic);
    }
  }

  const frequencies = new Map<string, number>();
  const words = context.toLowerCase().match(/[a-z][a-z'-]{4,}/g) || [];
  for (const word of words) {
    if (STOP_WORDS.has(word)) continue;
    frequencies.set(word, (frequencies.get(word) || 0) + 1);
  }
  for (const [word] of [...frequencies.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)) {
    const topic = word.charAt(0).toUpperCase() + word.slice(1);
    if (!topics.some((item) => item.toLowerCase().includes(word))) topics.push(topic);
  }
  return topics.slice(0, 8);
}

function detectSections(context: string) {
  const sections: string[] = [];
  if (/multiple choice|\bmcqs?\b/i.test(context)) sections.push('existing mcqs');
  if (/short questions?/i.test(context)) sections.push('short questions');
  if (/long questions?|descriptive questions?/i.test(context)) sections.push('long questions');
  if (/formula|equation|calculate|numerical/i.test(context)) sections.push('formulas or numericals');
  if (/example|worked|solution/i.test(context)) sections.push('worked examples');
  if (/definition|define|concept/i.test(context)) sections.push('concepts');
  return sections.length ? sections : ['study notes'];
}

export function analyzeResourceSource(context: string): ResourceAnalysis {
  const words = context.match(/\S+/g)?.length || 0;
  const existingMcqs = extractExistingMcqs(context).length;
  const questions = extractQuestionCandidates(context).length;
  const sections = detectSections(context);
  const documentType = /past paper/i.test(context)
    ? 'past_paper'
    : sections.includes('existing mcqs') &&
        (sections.includes('short questions') || sections.includes('long questions'))
      ? 'mixed'
      : /textbook|chapter/i.test(context)
        ? 'book'
        : 'notes';

  return {
    documentType,
    topics: extractTopics(context),
    detectedSections: sections,
    available: {
      mcq: Math.min(30, Math.max(existingMcqs, Math.max(5, Math.floor(words / 140)))),
      short: Math.min(15, Math.max(Math.min(questions, 15), Math.max(3, Math.floor(words / 420)))),
      long: Math.min(8, Math.max(sections.includes('long questions') ? 2 : 1, Math.floor(words / 1100))),
    },
  };
}

export function buildResourceSourceSummary(title: string, context: string) {
  const analysis = analyzeResourceSource(context);
  const points = extractStudyPoints(context).slice(0, 8);
  const topics = analysis.topics.length ? analysis.topics : ['Core chapter concepts'];
  const coverage = analysis.detectedSections.join(', ');
  const keyPoints = points.length
    ? points.map((point) => `- ${point}`).join('\n')
    : '- The source contains structured study material and practice questions for this chapter.';

  return `### ${title} - Source Summary

**What this file covers**

- **Document type:** ${analysis.documentType.replace('_', ' ')}
- **Detected material:** ${coverage}
- **Main topics:** ${topics.join(', ')}

**Key concepts and exam points**

${keyPoints}

**Revision checklist**

${topics
  .slice(0, 6)
  .map((topic) => `- [ ] Revise **${topic}** from the uploaded file`)
  .join('\n')}
- [ ] Attempt the available questions without looking at the answers
- [ ] Recheck definitions, formulas, units, and marked answer keys from the source`;
}

function definitionCards(points: string[]) {
  return points
    .map((point) => {
      const match = point.match(/^(.{2,70}?)\s+(is|are|means|refers to)\s+(.{8,160})[.]?$/i);
      if (!match) return null;
      return { term: match[1]!.trim(), verb: match[2]!.toLowerCase(), definition: match[3]!.trim() };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
}

function buildSyntheticMcqs(context: string, count: number) {
  const points = extractStudyPoints(context);
  const definitions = definitionCards(points);
  if (definitions.length < 4 || count <= 0) return [];

  const questions: SourceMcq[] = [];
  for (let index = 0; index < definitions.length && questions.length < count; index += 1) {
    const card = definitions[index]!;
    const otherCards = definitions.filter((_, cardIndex) => cardIndex !== index);
    const definitionOptions = [card, ...otherCards.slice(0, 3)];
    const definitionCorrect = index % 4;
    const shuffledDefinitions = [...definitionOptions];
    const [correctDefinition] = shuffledDefinitions.splice(0, 1);
    shuffledDefinitions.splice(definitionCorrect, 0, correctDefinition!);
    questions.push({
      q: `Which statement best defines ${card.term}?`,
      opts: shuffledDefinitions.map((item) => item.definition),
      correct: definitionCorrect,
      exp: `${card.term} ${card.verb} ${card.definition}`,
    });

    if (questions.length >= count) break;
    const conceptCorrect = (index + 1) % 4;
    const conceptOptions = [card.term, ...otherCards.slice(0, 3).map((item) => item.term)];
    const [correctConcept] = conceptOptions.splice(0, 1);
    conceptOptions.splice(conceptCorrect, 0, correctConcept!);
    questions.push({
      q: `Which concept is described as ${card.definition.replace(/[.]$/, '')}?`,
      opts: conceptOptions,
      correct: conceptCorrect,
      exp: `${card.term} ${card.verb} ${card.definition}`,
    });
  }

  return filterHighQualitySourceMcqs(questions).slice(0, count);
}

function keyPointsForTopic(topic: string, points: string[]) {
  const words = topic.toLowerCase().match(/[a-z]{4,}/g) || [];
  const matching = points.filter((point) => words.some((word) => point.toLowerCase().includes(word)));
  return (matching.length ? matching : points).slice(0, 4);
}

export function buildResourceSourceTest(
  title: string,
  context: string,
  counts: { mcq: number; short: number; long: number }
): FullTestPaper {
  const existingMcqs = extractExistingMcqs(context);
  const syntheticMcqs = buildSyntheticMcqs(context, counts.mcq);
  const mcqs = filterHighQualitySourceMcqs([...existingMcqs, ...syntheticMcqs]).slice(0, counts.mcq);
  const questions = extractQuestionCandidates(context)
    .filter((candidate) => !extractExistingMcqs(candidate.block).length)
    .map((candidate) => candidate.question);
  const topics = extractTopics(context);
  const points = extractStudyPoints(context);
  const questionAt = (index: number, kind: 'short' | 'long') =>
    questions[index] ||
    `${kind === 'short' ? 'Briefly explain' : 'Explain in detail'} ${topics[index % Math.max(topics.length, 1)] || 'the main concept in this source'}.`;

  const shortQs = Array.from({ length: counts.short }, (_, index) => {
    const q = questionAt(index, 'short');
    return { q, marks: 3, keyPoints: keyPointsForTopic(q, points).slice(0, 3) };
  });
  const longQs = Array.from({ length: counts.long }, (_, index) => {
    const q = questionAt(index + counts.short, 'long');
    return {
      q,
      marks: 8,
      keyPoints: keyPointsForTopic(q, points),
      guide:
        'Write a structured answer using only the uploaded source. Add headings, relevant examples, and formulas where present.',
    };
  });

  return {
    title: `${title} - Source Test`,
    totalMarks: mcqs.length + shortQs.length * 3 + longQs.length * 8,
    timeAllowed: Math.max(15, mcqs.length + shortQs.length * 5 + longQs.length * 12),
    mcqs,
    shortQs,
    longQs,
  };
}
