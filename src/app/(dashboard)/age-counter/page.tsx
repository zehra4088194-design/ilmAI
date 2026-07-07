import { Metadata } from 'next';
import { AgeCounterTool } from '@/components/features/age-counter/AgeCounterTool';
export const metadata: Metadata = { title: 'Age Counter' };

export default function AgeCounterPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div><h1 className="text-2xl font-bold">Age Counter 🎂</h1><p className="text-muted-foreground">Apni date of birth daalo, exact age saal/mahine/din mein dekho</p></div>
      <AgeCounterTool />
    </div>
  );
}
