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
    description: 'Flip and match concept cards to train short-term recall during a focused break.',
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
    description: 'Roll paired dice and solve fast arithmetic patterns with instant feedback.',
    thumbnail_url: null,
    category: 'Logic',
    game_type: 'logic_dice',
    difficulty: 'medium',
    featured: false,
    min_tier: 'PRO',
  },
];
