import { GameTabsSection } from '@/components/features/kids/GameTabsSection';
import { LetterMatchGame } from '@/components/features/school-erp/kids-zone/LetterMatchGame';
import { SpellingPopGame } from '@/components/features/school-erp/kids-zone/SpellingPopGame';
import { SightWordMatchGame } from '@/components/features/kids/SightWordMatchGame';

export const metadata = { title: 'English | ilm AI Kids' };

export default function KidsEnglishPage() {
  return (
    <GameTabsSection
      title="English / Alphabets 🔤"
      subtitle="Learn your letters and words the fun way!"
      tabs={[
        { key: 'letters', label: 'Letter Match', emoji: '🔤', Component: LetterMatchGame, category: 'english', xp: 3 },
        { key: 'spelling', label: 'Spelling Pop', emoji: '📖', Component: SpellingPopGame, category: 'english', xp: 4 },
        { key: 'sight-words', label: 'Word Match', emoji: '🖼️', Component: SightWordMatchGame, category: 'english', xp: 4 },
      ]}
    />
  );
}
