import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { removeOpportunityBookmark } from '../actions';

export const metadata: Metadata = { title: 'Saved Opportunities' };

export default async function SavedOpportunitiesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data } = await supabase
    .from('opportunity_bookmarks' as any)
    .select('reminder_date, opportunities(id, title, type, deadline, external_url)')
    .eq('student_id', user!.id)
    .order('reminder_date', { ascending: true, nullsFirst: false });
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div><p className="text-sm font-semibold text-violet-400">Opportunities</p><h1 className="mt-1 text-2xl font-bold">Saved deadlines</h1></div>
      <div className="space-y-3">
        {(data || []).map((row: any) => (
          <div key={row.opportunities?.id} className="glass flex items-center justify-between gap-3 rounded-xl p-4">
            <div><p className="font-semibold">{row.opportunities?.title}</p><p className="text-sm text-muted-foreground">Reminder: {row.reminder_date || 'Not set'}</p></div>
            <form action={removeOpportunityBookmark}><input type="hidden" name="opportunity_id" value={row.opportunities?.id} /><Button size="sm" variant="outline">Remove</Button></form>
          </div>
        ))}
      </div>
    </div>
  );
}
