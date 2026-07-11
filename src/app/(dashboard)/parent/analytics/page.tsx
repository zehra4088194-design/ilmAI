import { Metadata } from 'next';
import { RoleAnalyticsClient } from '@/components/features/analytics/RoleAnalyticsClient';

export const metadata: Metadata = { title: 'Parent Analytics' };

export default function ParentAnalyticsPage() {
  return (
    <RoleAnalyticsClient
      title="Child Analytics"
      subtitle="Linked student progress, anonymized peer comparison aur schedule follow-through."
      cards={[
        { label: 'Linked Students', value: 'Synced', detail: 'Parent links required' },
        { label: 'Study Trend', value: 'Weekly', detail: 'From student activity' },
        { label: 'Peer View', value: 'Anonymous', detail: 'No individual peer data exposed' },
        { label: 'Schedules', value: 'Parent', detail: 'Tracks assigned routines' },
      ]}
      trend={[{ label: 'Mon', value: 15 }, { label: 'Tue', value: 25 }, { label: 'Wed', value: 20 }, { label: 'Thu', value: 32 }, { label: 'Fri', value: 38 }]}
      bars={[{ label: 'Math', value: 62 }, { label: 'Physics', value: 48 }, { label: 'English', value: 74 }]}
      omitted={['screen-time summary if no session tracking exists']}
    />
  );
}
