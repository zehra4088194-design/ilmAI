import { Metadata } from 'next';
import { QuizEngine } from '@/components/features/quiz/QuizEngine';
export const metadata: Metadata = { title: 'Quiz Session' };
export default function QuizSessionPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <QuizEngine />
    </div>
  );
}
