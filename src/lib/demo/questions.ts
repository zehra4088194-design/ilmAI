export type DemoQuestionForClient = {
  id: string;
  text: string;
  type: 'MCQ';
  difficulty: string;
  marks: number;
  options: { id: string; text: string }[];
};

export type DemoQuestionResult = DemoQuestionForClient & {
  correctAnswer: string;
  explanation?: string | null;
  userAnswer?: string | null;
  isCorrect: boolean;
};

export function sanitizeDemoQuestion(question: any): DemoQuestionForClient {
  return {
    id: question.id,
    text: question.text,
    type: 'MCQ',
    difficulty: question.difficulty || 'MEDIUM',
    marks: Number(question.marks || 1),
    options: Array.isArray(question.options) ? question.options.map((option: any) => ({ id: String(option.id), text: String(option.text) })) : [],
  };
}

export function normalizeAnswer(value: unknown) {
  return typeof value === 'string' ? value.trim().toUpperCase() : '';
}
