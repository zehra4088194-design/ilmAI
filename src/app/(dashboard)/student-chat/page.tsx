import { Metadata } from 'next';
import { StudentChatClient } from '@/components/features/student-chat/StudentChatClient';
import { OnlineOnlyGate } from '@/components/features/offline/OnlineOnlyGate';

export const metadata: Metadata = { title: 'Study Buddies' };

export default function StudentChatPage() {
  return (
    <OnlineOnlyGate feature="Study Buddies" description="Live chat needs a connection to reach your class.">
      <StudentChatClient />
    </OnlineOnlyGate>
  );
}
