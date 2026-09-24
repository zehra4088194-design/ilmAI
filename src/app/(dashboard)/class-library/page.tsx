import Link from 'next/link';
import { Library } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/EmptyState';
import { getClassLibraryClasses } from '@/lib/class-library/queries';

export const metadata = { title: 'Class Library | ilm AI' };

export default async function ClassLibraryPage() {
  const classes = await getClassLibraryClasses();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Class Library</h1>
        <p className="text-muted-foreground mt-1 text-sm">Pick your class to see subjects and study material.</p>
      </header>

      {classes.length === 0 ? (
        <EmptyState
          icon={Library}
          title="No classes yet"
          description="Ask your admin to add a class in Class Library — it'll show up here immediately."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {classes.map((klass: any) => (
            <Link key={klass.id} href={`/class-library/${klass.slug}`}>
              <Card className="hover:border-primary/40 h-full transition-colors">
                <CardContent className="flex items-center gap-3 p-5">
                  <span className="bg-primary/10 text-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
                    <Library className="h-5 w-5" />
                  </span>
                  <span className="font-semibold">{klass.name}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
