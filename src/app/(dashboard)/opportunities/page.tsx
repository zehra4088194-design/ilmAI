import { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { bookmarkOpportunity } from './actions';

export const metadata: Metadata = { title: 'Opportunities' };

export default async function OpportunitiesPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  let query = supabase.from('opportunities' as any).select('*').eq('is_verified', true).order('deadline', { ascending: true, nullsFirst: false });
  if (params.type) query = query.eq('type', params.type);
  const { data } = await query;
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap justify-between gap-3">
        <div><p className="text-sm font-semibold text-violet-400">National hub</p><h1 className="mt-1 text-2xl font-bold">Opportunities</h1></div>
        <Button asChild variant="outline"><Link href="/opportunities/saved">Saved</Link></Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {(data || []).map((item: any) => (
          <div key={item.id} className="glass rounded-xl p-5">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-xs uppercase text-violet-400">{item.type}</p><h2 className="font-bold">{item.title}</h2></div>
              {item.deadline && <span className="text-xs text-muted-foreground">{item.deadline}</span>}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
            <form action={bookmarkOpportunity} className="mt-4 flex flex-wrap gap-2">
              <input type="hidden" name="opportunity_id" value={item.id} />
              <Input name="reminder_date" type="date" className="max-w-40" />
              <Button size="sm" variant="gradient">Bookmark</Button>
              {item.external_url && <Button asChild size="sm" variant="outline"><a href={item.external_url} target="_blank">Open</a></Button>}
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
