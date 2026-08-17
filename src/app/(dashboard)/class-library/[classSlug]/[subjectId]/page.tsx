import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, BookOpen, FileClock, FileQuestion, FlaskConical, ListChecks, NotebookText, Video } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { getClassLibraryClassBySlug, getClassLibrarySubjectById } from '@/lib/class-library/queries';

const RESOURCE_TILES = [
  { type: 'book', label: 'Books', icon: BookOpen },
  { type: 'past_paper', label: 'Past Papers', icon: FileClock },
  { type: 'topic_notes', label: 'Topic Wise Notes', icon: NotebookText },
  { type: 'video_lecture', label: 'Video Lectures', icon: Video },
  { type: 'practical_guide', label: 'Practical Guide', icon: FlaskConical },
  { type: 'recent_past_paper', label: 'Recent Past Papers', icon: FileClock },
  { type: 'result', label: 'Results', icon: ListChecks },
] as const;

export default async function ClassLibrarySubjectPage({
  params,
}: {
  params: Promise<{ classSlug: string; subjectId: string }>;
}) {
  const { classSlug, subjectId } = await params;
  const klass = await getClassLibraryClassBySlug(classSlug);
  if (!klass) notFound();
  const subject = await getClassLibrarySubjectById(subjectId);
  if (!subject || subject.class_id !== klass.id) notFound();

  const base = `/class-library/${classSlug}/${subjectId}`;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href={`/class-library/${classSlug}`} className="text-primary inline-flex items-center gap-1.5 text-sm hover:underline">
        <ArrowLeft className="h-4 w-4" /> Back to subjects
      </Link>
      <header>
        <h1 className="text-2xl font-bold">Syllabus of {subject.name}</h1>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {RESOURCE_TILES.map((tile) => (
          <Link key={tile.type} href={`${base}/resources/${tile.type}`}>
            <Card className="hover:border-primary/40 h-full transition-colors">
              <CardContent className="flex items-center gap-3 p-5">
                <span className="bg-primary/10 text-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
                  <tile.icon className="h-5 w-5" />
                </span>
                <span className="font-semibold">{tile.label}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
        <Link href={`${base}/mcqs`}>
          <Card className="hover:border-primary/40 h-full transition-colors">
            <CardContent className="flex items-center gap-3 p-5">
              <span className="bg-primary/10 text-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
                <FileQuestion className="h-5 w-5" />
              </span>
              <span className="font-semibold">MCQ's</span>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
