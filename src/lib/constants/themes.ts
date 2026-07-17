import { BookOpen, FlaskConical, Leaf, Moon, Palette, Snowflake, Sparkles, Sun, SunMedium } from 'lucide-react';

export type ThemeFamilyId =
  | 'light'
  | 'dark'
  | 'theme-pink'
  | 'theme-blue'
  | 'theme-paper'
  | 'theme-midnight'
  | 'theme-forest'
  | 'theme-sunset'
  | 'theme-copper'
  | 'theme-ice';
export type ThemeMode = 'light' | 'dark';
export type AppThemeId =
  | 'light-light'
  | 'light-dark'
  | 'dark-light'
  | 'dark-dark'
  | 'theme-pink-light'
  | 'theme-pink-dark'
  | 'theme-blue-light'
  | 'theme-blue-dark'
  | 'theme-paper-light'
  | 'theme-paper-dark'
  | 'theme-midnight-light'
  | 'theme-midnight-dark'
  | 'theme-forest-light'
  | 'theme-forest-dark'
  | 'theme-sunset-light'
  | 'theme-sunset-dark'
  | 'theme-copper-light'
  | 'theme-copper-dark'
  | 'theme-ice-light'
  | 'theme-ice-dark';

type AppThemeFamily = {
  id: ThemeFamilyId;
  name: string;
  description: string;
  image?: string;
  swatches: string[];
  icon: typeof Sun;
};

export const APP_THEME_FAMILIES: AppThemeFamily[] = [
  {
    id: 'light',
    name: 'Classic Dawn',
    description: 'Warm default workspace with a softer day/night pair.',
    swatches: ['#f4efe5', '#7c3aed', '#0ea5e9'],
    icon: Sun,
  },
  {
    id: 'dark',
    name: 'Violet Focus',
    description: 'Original dark-first vibe with a lighter study-sheet twin.',
    swatches: ['#120c26', '#a78bfa', '#38bdf8'],
    icon: Moon,
  },
  {
    id: 'theme-pink',
    name: 'Rose Focus',
    description: 'Rosy textured setup that now flips cleanly into a darker late-night variant.',
    image: '/background-pink.png',
    swatches: ['#d87f89', '#be185d', '#fff1f2'],
    icon: Sparkles,
  },
  {
    id: 'theme-blue',
    name: 'Blue Night',
    description: 'Ocean desk palette with both airy day mode and deep night mode.',
    image: '/background-blue.png',
    swatches: ['#17324f', '#60a5fa', '#dbeafe'],
    icon: Moon,
  },
  {
    id: 'theme-paper',
    name: 'Paper Notes',
    description: 'Readable notebook look for both bright reading and low-light revision.',
    image: '/background-light.png',
    swatches: ['#eee9db', '#2563eb', '#16a34a'],
    icon: BookOpen,
  },
  {
    id: 'theme-midnight',
    name: 'Midnight Grain',
    description: 'Grainy premium study desk with a lighter daytime companion.',
    image: '/background-dark.png',
    swatches: ['#191919', '#f59e0b', '#8b5cf6'],
    icon: Palette,
  },
  {
    id: 'theme-forest',
    name: 'Forest Study',
    description: 'Calm botanical greens for focused reading, with a deep woodland night mode.',
    swatches: ['#dcead8', '#2f855a', '#8bc34a'],
    icon: Leaf,
  },
  {
    id: 'theme-sunset',
    name: 'Sunset Atelier',
    description: 'Warm coral and amber workspace that shifts into a cinematic evening palette.',
    swatches: ['#ffe0c2', '#e76f51', '#f4a261'],
    icon: SunMedium,
  },
  {
    id: 'theme-copper',
    name: 'Copper Lab',
    description: 'Editorial copper accents and parchment surfaces for a crafted academic feel.',
    swatches: ['#f2e2d0', '#b45309', '#334155'],
    icon: FlaskConical,
  },
  {
    id: 'theme-ice',
    name: 'Ice Glass',
    description: 'Clean arctic blue day mode paired with a crisp cyan-on-slate night mode.',
    swatches: ['#e0f2fe', '#0284c7', '#67e8f9'],
    icon: Snowflake,
  },
];

export const APP_THEMES: Array<AppThemeFamily & { mode: ThemeMode; className: AppThemeId }> =
  APP_THEME_FAMILIES.flatMap((theme) => [
    { ...theme, mode: 'light' as const, className: `${theme.id}-light` as AppThemeId },
    { ...theme, mode: 'dark' as const, className: `${theme.id}-dark` as AppThemeId },
  ]);

export const APP_THEME_IDS = APP_THEMES.map((theme) => theme.className);
export const DEFAULT_THEME_FAMILY: ThemeFamilyId = 'dark';
export const DEFAULT_THEME_MODE: ThemeMode = 'dark';
export const DEFAULT_THEME_ID: AppThemeId = `${DEFAULT_THEME_FAMILY}-${DEFAULT_THEME_MODE}`;
export const THEME_COOKIE_NAME = 'ilm-ai-theme';

export function parseAppTheme(id?: string | null): { family: ThemeFamilyId; mode: ThemeMode; className: AppThemeId } {
  const match = APP_THEMES.find((theme) => theme.className === id);
  return match
    ? { family: match.id, mode: match.mode, className: match.className }
    : { family: DEFAULT_THEME_FAMILY, mode: DEFAULT_THEME_MODE, className: DEFAULT_THEME_ID };
}

export function getAppTheme(id?: string | null) {
  const parsed = parseAppTheme(id);
  return APP_THEME_FAMILIES.find((theme) => theme.id === parsed.family) || APP_THEME_FAMILIES[1]!;
}

export function buildThemeId(family: ThemeFamilyId, mode: ThemeMode): AppThemeId {
  return `${family}-${mode}` as AppThemeId;
}

export function isDarkThemeId(id?: string | null) {
  return parseAppTheme(id).mode === 'dark';
}

export function getThemeStylesheetHref(family: ThemeFamilyId) {
  return `/themes/${family}.css`;
}
