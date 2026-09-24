import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createTeacherClass } from '../../actions';

export const metadata: Metadata = { title: 'New Class' };

export default async function NewTeacherClassPage() {
  const supabase = await createClient();
  const { data: subjects } = await supabase.from('subjects').select('id, name').eq('is_active', true).order('name');
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-bold">Create class</h1>
      <form action={createTeacherClass} className="glass space-y-4 rounded-xl p-5">
        <Input name="name" placeholder="Class name" required />
        <select name="subject_id" className="h-10 w-full rounded-lg border bg-background px-3 text-sm"><option value="">Subject</option>{(subjects || []).map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select>
        <Input name="grade_level" placeholder="GRADE_10" />
        <Input name="board" placeholder="FBISE" />
        <Button variant="gradient">Create</Button>
      </form>
    </div>
  );
}
