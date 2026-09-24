import { Metadata } from 'next';
import { SpeakingPracticeClient } from '@/components/features/voice/SpeakingPracticeClient';
import { OnlineOnlyGate } from '@/components/features/offline/OnlineOnlyGate';

export const metadata: Metadata = { title: 'Speaking Practice' };

export default function SpeakingPracticePage() {
  return (
    <OnlineOnlyGate feature="Speaking Practice" description="Voice practice needs a connection to grade your speech.">
      <SpeakingPracticeClient />
    </OnlineOnlyGate>
  );
}
