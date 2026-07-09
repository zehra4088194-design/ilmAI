const SUBJECT_SUGGESTIONS: Record<string, string[]> = {
  physics: [
    "Newton's laws samjhao example ke saath",
    'Numerical solve karne me help karo',
    'Motion ke formulas revise karado',
    'Yeh diagram samajh nahi aaya, explain karo',
    'Is chapter ka quick summary do',
  ],
  chemistry: [
    'Periodic table ke trends samjhao',
    'Is reaction ko balance karo',
    'Organic chemistry ka naming rule batao',
    'Mole concept step-by-step samjhao',
    'Numerical mein stuck hoon, help karo',
  ],
  biology: [
    'Yeh diagram label karke samjhao',
    'Mitosis aur meiosis ka farq batao',
    'Is process ka flow explain karo',
    'MCQs ke liye key points do',
    'Yeh term define karo simple lafzon mein',
  ],
  mathematics: [
    'Is sawaal ka step-by-step hal batao',
    'Formula yaad karne ka tareeqa batao',
    'Graph banake samjhao',
    'Is concept ka easy example do',
    'Past paper ka sawaal solve karo',
  ],
  'computer-science': [
    'Yeh code ka logic samjhao',
    'Flowchart bana ke dikhao',
    'Is algorithm ka trace karo',
    'Syntax error fix karne mein help karo',
    'Concept ko real-life example se samjhao',
  ],
  english: [
    'Essay ka outline bana do',
    'Grammar mistake check karo',
    'Is paragraph ka summary do',
    'Comprehension answer likhne mein help karo',
    'Letter/application likhne mein guide karo',
  ],
  urdu: [
    'Is nazm ki tashreeh karo',
    'Mazmoon likhne mein madad karo',
    'Grammar (qawaid) samjhao',
    'Is ibarat ka khulasa do',
    'Muhavare aur zarb-ul-misal samjhao',
  ],
  islamiat: [
    'Is topic par asaan alfaz mein samjhao',
    'Hadith ka reference aur matlab batao',
    'Short notes bana do is chapter ke',
    'Exam ke liye important points do',
    'Is waqia ki tafseel batao',
  ],
  'pakistan-studies': [
    'Is event ka timeline samjhao',
    'Important dates yaad karne ka tareeqa batao',
    'Is topic ka summary do',
    'Map se related sawaal mein help karo',
    'Essay type answer likhne mein guide karo',
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
  'Is topic ko asaan tareeqe se samjhao',
  'Mujhe practice questions do',
  'Is chapter ka summary bana do',
  'Meri concept clear nahi, dobara samjhao',
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
