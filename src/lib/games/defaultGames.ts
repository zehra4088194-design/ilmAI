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
    title: 'Live Ludo Room',
    description: 'Study-safe live Ludo room for friends. 45 minutes/day only, then back to study.',
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
    title: 'Memory Match',
    description: 'Quick focus reset game for a relaxed brain break between study sessions.',
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
    description: 'Roll dice with friends and solve quick logic prompts in a live room.',
    thumbnail_url: null,
    category: 'Logic',
    game_type: 'logic_dice',
    difficulty: 'medium',
    featured: false,
    min_tier: 'PRO',
  },
];
