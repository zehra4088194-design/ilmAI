import { BookOpen, Moon, Palette, Sparkles, Sun } from 'lucide-react';

export type AppThemeId = 'light' | 'dark' | 'theme-pink' | 'theme-blue' | 'theme-paper' | 'theme-midnight';

export const APP_THEMES: Array<{
  id: AppThemeId;
  name: string;
  description: string;
  image?: string;
  swatches: string[];
  icon: typeof Sun;
}> = [
  {
    id: 'light',
    name: 'Classic Light',
    description: 'Clean warm default for daytime study.',
    swatches: ['#f4efe5', '#7c3aed', '#0ea5e9'],
    icon: Sun,
  },
  {
    id: 'dark',
    name: 'Classic Dark',
    description: 'Focused violet dark mode.',
    swatches: ['#080513', '#a78bfa', '#38bdf8'],
    icon: Moon,
  },
  {
    id: 'theme-pink',
    name: 'Rose Focus',
    description: 'Soft pink textured workspace.',
    image: '/background-pink.png',
    swatches: ['#d87f89', '#be185d', '#fff1f2'],
    icon: Sparkles,
  },
  {
    id: 'theme-blue',
    name: 'Blue Night',
    description: 'Deep blue premium study desk.',
    image: '/background-blue.png',
    swatches: ['#17324f', '#60a5fa', '#dbeafe'],
    icon: Moon,
  },
  {
    id: 'theme-paper',
    name: 'Paper Light',
    description: 'Readable dotted paper style.',
    image: '/background-light.png',
    swatches: ['#eee9db', '#2563eb', '#16a34a'],
    icon: BookOpen,
  },
  {
    id: 'theme-midnight',
    name: 'Midnight Grain',
    description: 'Black grain texture for late study.',
    image: '/background-dark.png',
    swatches: ['#191919', '#f59e0b', '#8b5cf6'],
    icon: Palette,
  },
];

export const APP_THEME_IDS = APP_THEMES.map((theme) => theme.id);

export function getAppTheme(id?: string | null) {
  return APP_THEMES.find((theme) => theme.id === id) || APP_THEMES[1]!;
}
