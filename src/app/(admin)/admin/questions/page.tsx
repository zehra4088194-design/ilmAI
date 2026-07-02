import { Metadata } from 'next';
import { createAdminClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
export const metadata: Metadata = { title: 'Admin - Questions' };

export default async function AdminQuestionsPage() {
  const supabase = await createAdminClient();
  const { data: questions } = await supabase.from('questions').select('*').order('created_at', { ascending: false }).limit(30);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Question Bank</h1>
      <div className="space-y-3">
        {(questions || []).map(q => (
          <Card key={q.id}><CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2"><Badge variant="outline">{q.type}</Badge><Badge variant={q.is_verified ? 'success' : 'warning'}>{q.is_verified ? 'Verified' : 'Pending'}</Badge></div>
            <p className="text-sm">{q.text}</p>
          </CardContent></Card>
        ))}
        {(!questions || questions.length === 0) && <p className="text-muted-foreground text-center py-8">Koi questions nahi hain. AI se generate karo ya seed karo.</p>}
      </div>
    </div>
  );
}
