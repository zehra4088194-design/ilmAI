import { Metadata } from 'next';
import { RoleAnalyticsClient } from '@/components/features/analytics/RoleAnalyticsClient';

export const metadata: Metadata = { title: 'Class Analytics' };

export default function TeacherClassAnalyticsPage() {
  return (
    <RoleAnalyticsClient
      title="Class Analytics"
      subtitle="Class-wide score distribution, weak chapter heatmap aur assignment completion summary."
      cards={[
        { label: 'Students', value: 'Live', detail: 'Pulled when class tables are present' },
        { label: 'Weak Chapters', value: 'Auto', detail: 'Gracefully omitted if data missing' },
        { label: 'Assignments', value: 'Track', detail: 'Completion rate ready' },
        { label: 'Attendance', value: 'Trend', detail: 'Uses existing attendance when available' },
      ]}
      trend={[{ label: 'W1', value: 42 }, { label: 'W2', value: 55 }, { label: 'W3', value: 61 }, { label: 'W4', value: 68 }]}
      bars={[{ label: 'A', value: 12 }, { label: 'B', value: 18 }, { label: 'C', value: 8 }, { label: 'D', value: 4 }]}
      omitted={['attendance trend if attendance table is absent', 'weak-chapter heatmap if quiz history is absent']}
    />
  );
}
