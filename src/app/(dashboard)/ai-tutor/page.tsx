import { Metadata } from 'next';
import { ChatInterface } from '@/components/features/ai-tutor/ChatInterface';
export const metadata: Metadata = { title: 'AI Tutor' };
export default function AiTutorPage() {
  return (
    <div className="h-[calc(100vh-7rem)] -m-4 md:-m-6 lg:-m-8">
      <ChatInterface />
    </div>
  );
}
