import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { createOpportunity, deleteOpportunity, toggleOpportunityVerified } from './actions';

export const metadata: Metadata = { title: 'Admin Opportunities' };

export default async function AdminOpportunitiesPage() {
  const supabase = await createClient();
  const { data } = await supabase.from('opportunities' as any).select('*').order('created_at', { ascending: false }).limit(50);
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Opportunities</h1><p className="text-muted-foreground">Drafts stay hidden until verified.</p></div>
      <form action={createOpportunity} className="grid gap-3 rounded-xl border p-4 md:grid-cols-2">
        <Input name="title" placeholder="Title" required />
        <select name="type" className="h-10 rounded-lg border bg-background px-3 text-sm"><option value="scholarship">Scholarship</option><option value="competition">Competition</option><option value="olympiad">Olympiad</option><option value="hackathon">Hackathon</option><option value="internship">Internship</option><option value="research">Research</option><option value="admission">Admission</option><option value="government">Government</option></select>
        <Input name="organization" placeholder="Organization" />
        <Input name="deadline" type="date" />
        <Input name="external_url" placeholder="External URL" className="md:col-span-2" />
        <Textarea name="description" placeholder="Description" className="md:col-span-2" />
        <Textarea name="eligibility" placeholder="Eligibility" className="md:col-span-2" />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_verified" /> Verified</label>
        <Button variant="gradient">Create</Button>
      </form>
      <div className="space-y-2">
        {(data || []).map((item: any) => (
          <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
            <div>
              <p className="font-semibold">{item.title}</p>
              <p className="text-xs text-muted-foreground">{item.type} · {item.is_verified ? 'verified' : 'draft'} · {item.source}</p>
            </div>
            <div className="flex gap-2">
              <form action={toggleOpportunityVerified}>
                <input type="hidden" name="id" value={item.id} />
                <input type="hidden" name="is_verified" value={String(!item.is_verified)} />
                <Button size="sm" variant="outline">{item.is_verified ? 'Unverify' : 'Verify'}</Button>
              </form>
              <form action={deleteOpportunity}>
                <input type="hidden" name="id" value={item.id} />
                <Button size="sm" variant="destructive">Delete</Button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
