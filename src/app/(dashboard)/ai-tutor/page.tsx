import { Metadata } from 'next';
import { ChatInterface } from '@/components/features/ai-tutor/ChatInterface';
export const metadata: Metadata = { title: 'AI Tutor' };
export default function AiTutorPage() {
  // No OnlineOnlyGate here on purpose: conversation history lives in the chat store, which
  // persists to localStorage (src/store/chat.store.ts), so it's already on the device with no
  // network needed. Gating the whole page would hide that history every time the student is
  // offline. ChatInterface itself only blocks the parts that genuinely need a live connection
  // (sending a new message) — see the isOnline check inside it.
  return (
    <div className="-m-3 h-[calc(100dvh-4rem)] min-h-[32rem] overflow-hidden sm:-m-4 md:-m-6 lg:-m-8">
      <ChatInterface />
    </div>
  );
}
