import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  BookOpen,
  FileClock,
  FileText,
  FileQuestion,
  FlaskConical,
  ListChecks,
  NotebookText,
  PenLine,
  Video,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { getUniversityProgramBySlug, getUniversitySubjectById } from '@/lib/university-hub/queries';

const RESOURCE_TILES = [
  { type: 'book', label: 'Books', icon: BookOpen },
  { type: 'past_paper', label: 'Past Papers', icon: FileClock },
  { type: 'topic_notes', label: 'Topic Wise Notes', icon: NotebookText },
  { type: 'video_lecture', label: 'Video Lectures', icon: Video },
  { type: 'practical_guide', label: 'Practical Guide', icon: FlaskConical },
  { type: 'recent_past_paper', label: 'Recent Past Papers', icon: FileClock },
  { type: 'result', label: 'Results', icon: ListChecks },
] as const;

export default async function UniversitySubjectPage({
  params,
}: {
  params: Promise<{ programSlug: string; yearId: string; subjectId: string }>;
}) {
  const { programSlug, yearId, subjectId } = await params;
  const program = await getUniversityProgramBySlug(programSlug);
  if (!program) notFound();
  const subject = await getUniversitySubjectById(subjectId, yearId);
  if (!subject) notFound();

  const base = `/university-hub/${programSlug}/${yearId}/${subjectId}`;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href={`/university-hub/${programSlug}/${yearId}`} className="text-primary inline-flex items-center gap-1.5 text-sm hover:underline">
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
        <Link href={`${base}/practice/short`}>
          <Card className="hover:border-primary/40 h-full transition-colors">
            <CardContent className="flex items-center gap-3 p-5">
              <span className="bg-primary/10 text-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
                <FileText className="h-5 w-5" />
              </span>
              <span className="font-semibold">Short Questions</span>
            </CardContent>
          </Card>
        </Link>
        <Link href={`${base}/practice/long`}>
          <Card className="hover:border-primary/40 h-full transition-colors">
            <CardContent className="flex items-center gap-3 p-5">
              <span className="bg-primary/10 text-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
                <PenLine className="h-5 w-5" />
              </span>
              <span className="font-semibold">Long Questions</span>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
