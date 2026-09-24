export type GameCardData = {
  id: string;
  slug: string;
  title: string;
  description: string;
  thumbnail_url: string | null;
  category: string;
  game_type: string;
  difficulty: 'easy' | 'medium' | 'hard' | null;
  featured: boolean;
  min_tier: 'PRO' | 'ELITE';
};

export const DEFAULT_GAMES: GameCardData[] = [
  {
    id: 'curriculum-quiz-room',
    slug: 'curriculum-quiz-room',
    title: 'Class MCQ Challenge',
    description: 'Answer random questions from your class books and reveal the correct choice together.',
    thumbnail_url: null,
    category: 'Quiz',
    game_type: 'curriculum_quiz',
    difficulty: 'medium',
    featured: true,
    min_tier: 'PRO',
  },
  {
    id: 'live-ludo',
    slug: 'live-ludo',
    title: 'Ludo Dice Room',
    description: 'A timed room with a Ludo-style board, dice rolls, and study-safe room activity.',
    thumbnail_url: null,
    category: 'Board',
    game_type: 'live_ludo',
    difficulty: 'easy',
    featured: true,
    min_tier: 'PRO',
  },
  {
    id: 'memory-match',
    slug: 'memory-match',
    title: 'Memory Matrix',
    description: 'Pick a subject — Physics, Biology, Chemistry, Math, English, Pak Studies, or Mixed — and flip cards to match each term with its answer. Tracks your personal best.',
    thumbnail_url: null,
    category: 'Memory',
    game_type: 'memory_match',
    difficulty: 'easy',
    featured: false,
    min_tier: 'PRO',
  },
  {
    id: 'logic-dice',
    slug: 'logic-dice',
    title: 'Logic Dice',
    description: 'Roll two dice, race the room to solve the same arithmetic pattern, and climb the shared scoreboard.',
    thumbnail_url: null,
    category: 'Logic',
    game_type: 'logic_dice',
    difficulty: 'medium',
    featured: false,
    min_tier: 'PRO',
  },
];
