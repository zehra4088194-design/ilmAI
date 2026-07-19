import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Home, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 text-center">
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 flex items-center justify-center mb-6">
        <Search className="w-10 h-10 text-violet-400" />
      </div>
      <h1 className="text-6xl font-bold gradient-text mb-4">404</h1>
      <h2 className="text-xl font-semibold mb-2">Page not found</h2>
      <p className="text-muted-foreground mb-8 max-w-sm">This page does not exist or has moved. Return to the dashboard.</p>
      <Button asChild variant="gradient"><Link href="/"><Home className="w-4 h-4" />Go home</Link></Button>
    </div>
  );
}
