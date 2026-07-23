export function normalizeQuestionOptions(options: unknown): string[] {
  if (Array.isArray(options)) return options.map((option) => String(option));
  if (!options || typeof options !== 'object') return [];
  return Object.values(options as Record<string, unknown>).map((option) => String(option));
}

function unwrapAnswer(answer: unknown): unknown {
  if (!answer || typeof answer !== 'object' || Array.isArray(answer)) return answer;
  const value = answer as Record<string, unknown>;
  return value.index ?? value.answer ?? value.value;
}

export function getCorrectOptionIndex(options: unknown, answer: unknown): number | null {
  const normalizedAnswer = unwrapAnswer(answer);
  const entries = Array.isArray(options)
    ? options.map((option, index) => [String(index), option] as const)
    : options && typeof options === 'object'
      ? Object.entries(options as Record<string, unknown>)
      : [];
  if (!entries.length) return null;

  if (typeof normalizedAnswer === 'number' && Number.isInteger(normalizedAnswer)) {
    return normalizedAnswer >= 0 && normalizedAnswer < entries.length ? normalizedAnswer : null;
  }

  const value = String(normalizedAnswer ?? '').trim();
  if (!value) return null;
  if (/^\d+$/.test(value)) {
    const index = Number(value);
    if (index >= 0 && index < entries.length) return index;
  }

  const keyIndex = entries.findIndex(([key]) => key.toLowerCase() === value.toLowerCase());
  if (keyIndex >= 0) return keyIndex;
  const textIndex = entries.findIndex(([, option]) => String(option).trim().toLowerCase() === value.toLowerCase());
  return textIndex >= 0 ? textIndex : null;
}
