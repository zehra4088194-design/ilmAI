'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils/cn';
import { saveCareerProfile } from '../actions';

const INTERESTS = ['Engineering', 'Medicine', 'Computer Science', 'Business', 'Design', 'Teaching', 'Law', 'Research', 'Media', 'Government'];
const QUESTIONS = [
  ['analytical', 'I enjoy solving logic, math, or data problems.'],
  ['creative', 'I like making original things or expressing ideas visually.'],
  ['social', 'I enjoy helping, teaching, or working closely with people.'],
  ['practical', 'I prefer hands-on work and real-world projects.'],
  ['leadership', 'I like organizing people and taking responsibility.'],
  ['detail_oriented', 'I notice small details and prefer careful work.'],
  ['entrepreneurial', 'I am curious about building products or businesses.'],
  ['research_minded', 'I enjoy reading deeply and investigating questions.'],
] as const;

export function CareerSetupWizard({ existing }: { existing: any }) {
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<string[]>(existing?.interests || []);
  const existingTraits = existing?.personality_traits || {};
  const selectedText = useMemo(() => selected.join(', '), [selected]);
  async function handleSubmit(formData: FormData) {
    await saveCareerProfile(formData);
  }

  return (
    <form action={handleSubmit} className="glass space-y-5 rounded-xl p-5">
      <input type="hidden" name="interests" value={selectedText} />
      <div className="mb-5 flex gap-2">
        {[0, 1, 2, 3].map((item) => <div key={item} className={cn('h-1 flex-1 rounded-full', item <= step ? 'bg-primary' : 'bg-muted')} />)}
      </div>

      {step === 0 && (
        <section className="space-y-4">
          <div><p className="text-sm font-semibold text-violet-400">Step 1</p><h2 className="text-xl font-bold">Choose your interests</h2></div>
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map((interest) => (
              <button
                key={interest}
                type="button"
                onClick={() => setSelected((current) => current.includes(interest) ? current.filter((item) => item !== interest) : [...current, interest])}
                className={cn('rounded-lg border px-3 py-2 text-sm font-medium', selected.includes(interest) ? 'border-violet-500 bg-violet-500/10 text-violet-300' : 'border-border')}
              >
                {interest}
              </button>
            ))}
          </div>
          <Input value={selectedText} onChange={(event) => setSelected(event.target.value.split(',').map((item) => item.trim()).filter(Boolean))} placeholder="Or type custom interests, comma separated" />
        </section>
      )}

      {step === 1 && (
        <section className="space-y-4">
          <div><p className="text-sm font-semibold text-violet-400">Step 2</p><h2 className="text-xl font-bold">Quick personality quiz</h2></div>
          {QUESTIONS.map(([name, label]) => (
            <div key={name} className="rounded-lg border bg-muted/20 p-3">
              <Label htmlFor={name}>{label}</Label>
              <Input id={name} name={name} type="range" min="1" max="10" defaultValue={existingTraits[name] || 5} className="mt-2" />
            </div>
          ))}
        </section>
      )}

      {step === 2 && (
        <section className="space-y-4">
          <div><p className="text-sm font-semibold text-violet-400">Step 3</p><h2 className="text-xl font-bold">Preferences</h2></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Budget range</Label>
              <select name="budget_range" defaultValue={existing?.budget_range || 'flexible'} className="h-10 w-full rounded-lg border bg-background px-3 text-sm">
                <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="flexible">Flexible</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Learning style override</Label>
              <select name="learning_style_override" defaultValue={existing?.learning_style_override || ''} className="h-10 w-full rounded-lg border bg-background px-3 text-sm">
                <option value="">Auto</option><option value="visual">Visual</option><option value="auditory">Auditory</option><option value="reading">Reading</option><option value="kinesthetic">Kinesthetic</option>
              </select>
            </div>
          </div>
          <Input name="preferred_city" defaultValue={existing?.preferred_city || ''} placeholder="Preferred city" />
          <Input name="preferred_university" defaultValue={existing?.preferred_university || ''} placeholder="Preferred university" />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="study_abroad_interest" defaultChecked={existing?.study_abroad_interest} /> Interested in study abroad</label>
          <Textarea name="long_term_goal" defaultValue={existing?.long_term_goal || ''} placeholder="Long-term goal" />
        </section>
      )}

      {step === 3 && (
        <section className="space-y-3">
          <div><p className="text-sm font-semibold text-violet-400">Step 4</p><h2 className="text-xl font-bold">Review</h2></div>
          <p className="rounded-lg border p-3 text-sm">Interests: {selectedText || 'None selected yet'}</p>
          <p className="text-sm text-muted-foreground">Save this profile, then generate recommendations from the Career page.</p>
        </section>
      )}

      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="outline" disabled={step === 0} onClick={() => setStep((value) => Math.max(0, value - 1))}>Back</Button>
        {step < 3 ? <Button type="button" variant="gradient" onClick={() => setStep((value) => Math.min(3, value + 1))}>Next</Button> : <Button variant="gradient">Save career profile</Button>}
      </div>
    </form>
  );
}
