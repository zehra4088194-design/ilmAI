import { Metadata } from 'next';
import { ChatInterface } from '@/components/features/ai-tutor/ChatInterface';
export const metadata: Metadata = { title: 'AI Tutor' };
export default function AiTutorPage() {
  return (
    <div className="-m-3 h-[calc(100dvh-4rem)] min-h-[32rem] overflow-hidden sm:-m-4 md:-m-6 lg:-m-8">
      <ChatInterface />
    </div>
  );
}
