import { Metadata } from 'next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { joinTeacherClass } from '../teacher/actions';

export const metadata: Metadata = { title: 'Join Class' };

export default function JoinClassPage() {
  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="text-2xl font-bold">Join a class</h1>
      <form action={joinTeacherClass} className="glass space-y-4 rounded-xl p-5">
        <Input name="join_code" placeholder="Join code" required />
        <Button variant="gradient">Join</Button>
      </form>
    </div>
  );
}
