import { Metadata } from 'next';
import { SpeakingPracticeClient } from '@/components/features/voice/SpeakingPracticeClient';

export const metadata: Metadata = { title: 'Speaking Practice' };

export default function SpeakingPracticePage() {
  return <SpeakingPracticeClient />;
}
