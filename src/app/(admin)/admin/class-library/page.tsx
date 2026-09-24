import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ClassLibraryActionForm } from '@/components/features/class-library/ClassLibraryActionForm';
import { ResourceCoverageBadges } from '@/components/features/admin/content/ResourceCoverageBadges';
import { getClassLibraryAdminTree, getClassLibraryAdminStats } from '@/lib/class-library/queries';
import { CLASS_LIBRARY_RESOURCE_TYPES } from '@/lib/class-library/types';
import { createClassLibraryClass, createClassLibrarySubject, deleteClassLibrarySubject } from '@/lib/class-library/admin-actions';

export const metadata = { title: 'Class Library | Admin | ilm AI' };

export default async function AdminClassLibraryPage() {
  const [classes, stats] = await Promise.all([getClassLibraryAdminTree(), getClassLibraryAdminStats()]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Class Library</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Platform-wide, Class 1 and up — dynamic: add a class and subject here and it shows up for every student
          immediately, no deploy needed.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create class</CardTitle>
        </CardHeader>
        <CardContent>
          <ClassLibraryActionForm action={createClassLibraryClass} submitLabel="Create class" className="flex gap-2">
            <Input name="name" placeholder="Class name (e.g. Class 1, KG, Nursery)" required className="max-w-sm" />
          </ClassLibraryActionForm>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {classes.map((klass: any) => (
          <Card key={klass.id}>
            <CardContent className="space-y-3 p-4">
              <div>
                <h2 className="font-semibold">{klass.name}</h2>
                <p className="text-muted-foreground text-xs">/{klass.slug}</p>
              </div>
              <div className="space-y-1.5">
                {klass.subjects.map((subject: any) => (
                  <div key={subject.id} className="border-border/60 space-y-1 border-b pb-1.5 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        href={`/admin/class-library/subjects/${subject.id}`}
                        className="text-primary truncate text-xs font-medium hover:underline"
                      >
                        {subject.name}
                      </Link>
                      <ClassLibraryActionForm action={deleteClassLibrarySubject} submitLabel="Remove" className="shrink-0">
                        <input type="hidden" name="subject_id" value={subject.id} />
                      </ClassLibraryActionForm>
                    </div>
                    <ResourceCoverageBadges
                      resourceTypes={CLASS_LIBRARY_RESOURCE_TYPES}
                      resourceCounts={stats[subject.id]?.resourceCounts}
                      questionCount={stats[subject.id]?.questionCount}
                    />
                  </div>
                ))}
                {klass.subjects.length === 0 && <p className="text-muted-foreground text-xs">No subjects yet.</p>}
              </div>
              <ClassLibraryActionForm action={createClassLibrarySubject} submitLabel="Add subject" className="flex gap-2">
                <input type="hidden" name="class_id" value={klass.id} />
                <Input name="name" placeholder="Subject name" required className="h-9 text-sm" />
              </ClassLibraryActionForm>
            </CardContent>
          </Card>
        ))}
        {classes.length === 0 && <p className="text-muted-foreground text-sm">No classes yet — create one above to get started.</p>}
      </div>
    </div>
  );
}
