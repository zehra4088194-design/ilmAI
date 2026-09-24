import { GameTabsSection } from '@/components/features/kids/GameTabsSection';
import { CountAndTapGame } from '@/components/features/school-erp/kids-zone/CountAndTapGame';
import { SimpleMathGame } from '@/components/features/school-erp/kids-zone/SimpleMathGame';
import { NumberCompareGame } from '@/components/features/kids/NumberCompareGame';

export const metadata = { title: 'Maths | ilm AI Kids' };

export default function KidsMathsPage() {
  return (
    <GameTabsSection
      title="Numbers / Basic Maths 🔢"
      subtitle="Count, add, and subtract with fun games!"
      tabs={[
        { key: 'counting', label: 'Count & Tap', emoji: '🔢', Component: CountAndTapGame, category: 'maths', xp: 3 },
        { key: 'math', label: 'Simple Math', emoji: '➕', Component: SimpleMathGame, category: 'maths', xp: 4 },
        { key: 'compare', label: 'Big or Small', emoji: '⚖️', Component: NumberCompareGame, category: 'maths', xp: 3 },
      ]}
    />
  );
}
