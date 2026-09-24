import { Metadata } from 'next';
import { StudentChatClient } from '@/components/features/student-chat/StudentChatClient';

export const metadata: Metadata = { title: 'Study Buddies' };

// No OnlineOnlyGate here on purpose: buddy requests and past messages are mirrored to
// IndexedDB (src/lib/offline/read-cache.ts) on every successful load, so they're still visible
// offline. StudentChatClient disables just the send box (via useOnlineStatus) instead of hiding
// the whole page — see src/lib/offline/online-only.ts for the reasoning.
export default function StudentChatPage() {
  return <StudentChatClient />;
}
