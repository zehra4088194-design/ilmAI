import { Metadata } from 'next';
import { QuestionBankManager } from '@/components/features/admin/questions/QuestionBankManager';

export const metadata: Metadata = { title: 'Admin - Questions' };

export default function AdminQuestionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Question Bank</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Class, subject, chapter aur topic select karke MCQs aur short questions manually add karo.
        </p>
      </div>
      <QuestionBankManager />
    </div>
  );
}
