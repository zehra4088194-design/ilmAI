const SUBJECT_SUGGESTIONS: Record<string, string[]> = {
  physics: [
    "Explain Newton's laws with examples",
    'Help me solve a numerical problem',
    'Review the formulas of motion',
    'Explain this diagram clearly',
    'Give me a quick summary of this chapter',
  ],
  chemistry: [
    'Explain periodic table trends',
    'Balance this chemical reaction',
    'Explain organic chemistry naming rules',
    'Explain the mole concept step by step',
    'Help me with this numerical problem',
  ],
  biology: [
    'Label and explain this diagram',
    'Explain the difference between mitosis and meiosis',
    'Explain the flow of this process',
    'Give me the key points for MCQs',
    'Define this term in simple words',
  ],
  mathematics: [
    'Solve this question step by step',
    'Help me remember this formula',
    'Explain this concept with a graph',
    'Give me a simple example of this concept',
    'Solve this past-paper question',
  ],
  'computer-science': [
    'Explain the logic of this code',
    'Show this process as a flowchart',
    'Trace this algorithm step by step',
    'Help me fix this syntax error',
    'Explain this concept with a real-life example',
  ],
  english: [
    'Create an outline for my essay',
    'Check this text for grammar mistakes',
    'Summarize this paragraph',
    'Help me write a comprehension answer',
    'Guide me in writing a letter or application',
  ],
  urdu: [
    'Explain this poem',
    'Help me write an Urdu essay',
    'Explain this grammar rule',
    'Summarize this passage',
    'Explain these idioms and proverbs',
  ],
  islamiat: [
    'Explain this topic in simple words',
    'Give the reference and meaning of this hadith',
    'Create short notes for this chapter',
    'Give me the important points for the exam',
    'Explain this event in detail',
  ],
  'pakistan-studies': [
    'Explain the timeline of this event',
    'Help me remember these important dates',
    'Summarize this topic',
    'Help me answer this map-related question',
    'Guide me in writing an essay-style answer',
  ],
};

const SUBJECT_ALIASES: Record<string, string> = {
  math: 'mathematics',
  maths: 'mathematics',
  computer: 'computer-science',
  'computer-science': 'computer-science',
  'computer-studies': 'computer-science',
  'pak-studies': 'pakistan-studies',
  'pakistan-study': 'pakistan-studies',
  'pakistan-studies': 'pakistan-studies',
};

const GENERIC_FALLBACK = [
  'Explain this topic in a simple way',
  'Give me practice questions',
  'Summarize this chapter',
  'Explain this concept again with an example',
];

function normalizeSubjectKey(subjectIdentifier?: string | null) {
  if (!subjectIdentifier) return '';
  const key = subjectIdentifier
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return SUBJECT_ALIASES[key] ?? key;
}

export function getSuggestionsForSubject(subjectIdentifier?: string | null): string[] {
  const key = normalizeSubjectKey(subjectIdentifier);
  return SUBJECT_SUGGESTIONS[key] ?? GENERIC_FALLBACK;
}
