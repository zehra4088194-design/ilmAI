import { GameTabsSection } from '@/components/features/kids/GameTabsSection';
import { UrduAlphabetMatchGame } from '@/components/features/kids/UrduAlphabetMatchGame';
import { NumberWordMatchGame } from '@/components/features/school-erp/kids-zone/NumberWordMatchGame';
import { UrduAddSubtractGame } from '@/components/features/school-erp/kids-zone/UrduAddSubtractGame';
import { ShapeColorMatchGame } from '@/components/features/school-erp/kids-zone/ShapeColorMatchGame';
import { UrduWordPictureMatchGame } from '@/components/features/kids/UrduWordPictureMatchGame';

export const metadata = { title: 'Urdu Learning | ilm AI Kids' };

export default function KidsUrduPage() {
  return (
    <GameTabsSection
      title="اردو سیکھیں — Urdu Learning 🪄"
      subtitle="Letters, counting, and shapes in Urdu!"
      tabs={[
        { key: 'alphabet', label: 'حروف تہجی', emoji: '🔤', Component: UrduAlphabetMatchGame, category: 'urdu', xp: 4 },
        { key: 'ginti', label: 'گنتی', emoji: '🔢', Component: NumberWordMatchGame, category: 'urdu', xp: 3 },
        { key: 'hisaab', label: 'حساب', emoji: '➕', Component: UrduAddSubtractGame, category: 'urdu', xp: 4 },
        { key: 'shapes', label: 'رنگ و شکل', emoji: '🔺', Component: ShapeColorMatchGame, category: 'urdu', xp: 3 },
        { key: 'words', label: 'الفاظ', emoji: '🖼️', Component: UrduWordPictureMatchGame, category: 'urdu', xp: 4 },
      ]}
    />
  );
}
