import { Metadata } from 'next';
import { ChatInterface } from '@/components/features/ai-tutor/ChatInterface';
import { OnlineOnlyGate } from '@/components/features/offline/OnlineOnlyGate';
export const metadata: Metadata = { title: 'AI Tutor' };
export default function AiTutorPage() {
  return (
    <div className="-m-3 h-[calc(100dvh-4rem)] min-h-[32rem] overflow-hidden sm:-m-4 md:-m-6 lg:-m-8">
      <OnlineOnlyGate feature="AI Tutor" className="h-full rounded-none">
        <ChatInterface />
      </OnlineOnlyGate>
    </div>
  );
}
