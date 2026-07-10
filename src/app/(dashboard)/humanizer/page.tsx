import { Metadata } from 'next';
import { AIHumanizerTool } from '@/components/features/tools/AIHumanizerTool';

export const metadata: Metadata = { title: 'AI Humanizer' };

export default function HumanizerPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">AI Humanizer</h1>
        <p className="text-muted-foreground">AI-like text ko natural, readable aur personalized study draft mein convert karo.</p>
      </div>
      <AIHumanizerTool />
    </div>
  );
}
