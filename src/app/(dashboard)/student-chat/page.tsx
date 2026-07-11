import { Metadata } from 'next';
import { StudentChatClient } from '@/components/features/student-chat/StudentChatClient';

export const metadata: Metadata = { title: 'Study Buddies' };

export default function StudentChatPage() {
  return <StudentChatClient />;
}
