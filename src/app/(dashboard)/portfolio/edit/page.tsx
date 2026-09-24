import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { savePortfolioSettings } from '../actions';

export const metadata: Metadata = { title: 'Edit Portfolio' };

export default async function PortfolioEditPage() {
  const supabase = await createClient();
  const db = supabase as any;
  const { data: { user } } = await supabase.auth.getUser();
  const { data: settings } = await db.from('portfolio_settings').select('*').eq('student_id', user!.id).maybeSingle();
  async function handleSubmit(formData: FormData) {
    'use server';
    await savePortfolioSettings(formData);
  }
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-sm font-semibold text-violet-400">Portfolio</p>
        <h1 className="mt-1 text-2xl font-bold">Edit public profile</h1>
      </div>
      <form action={handleSubmit} className="glass space-y-5 rounded-xl p-5">
        <label className="flex items-center gap-3 text-sm font-medium">
          <input type="checkbox" name="is_public" defaultChecked={settings?.is_public} />
          Public portfolio
        </label>
        <div className="space-y-2">
          <Label htmlFor="slug">Public slug</Label>
          <Input id="slug" name="public_slug" defaultValue={settings?.public_slug || ''} placeholder="ahmad-learning" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="headline">Headline</Label>
          <Input id="headline" name="headline" defaultValue={settings?.headline || ''} placeholder="Aspiring engineer, strong in mathematics" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea id="bio" name="bio" defaultValue={settings?.bio || ''} rows={6} />
        </div>
        <Button variant="gradient">Save portfolio</Button>
      </form>
    </div>
  );
}
