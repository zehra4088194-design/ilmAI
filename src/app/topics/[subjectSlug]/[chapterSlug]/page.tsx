import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, BookOpen, FileCheck2, FileQuestion, Library, ListChecks } from 'lucide-react';
import { createServiceClient } from '@/lib/supabase/service';

type Params = { subjectSlug: string; chapterSlug: string };

type ResourceRow = {
  id: string;
  title: string;
  description: string | null;
  resource_type: string;
  book_title: string | null;
  content_section: string | null;
  has_context_text: boolean | null;
};

type QuestionRow = {
  id: string;
  question_type: string | null;
  text: string;
  options: unknown;
  marks: number | null;
};

type ChunkRow = {
  resource_id: string;
  chunk_index: number;
  page_number: number | null;
  heading: string | null;
  text: string;
};

type PaperRow = {
  id: string;
  year: number;
  paper_type: string;
  total_questions: number | null;
  duration: number | null;
  is_verified: boolean;
};

async function getTopic(subjectSlug: string, chapterSlug: string) {
  const db = createServiceClient();
  const { data: subject } = await db
    .from('subjects')
    .select('id,name,slug')
    .eq('slug', subjectSlug)
    .eq('is_active', true)
    .maybeSingle();

  if (!subject) return null;

  const { data: chapter } = await db
    .from('chapters')
    .select('id,name,slug,description')
    .eq('subject_id', subject.id)
    .eq('slug', chapterSlug)
    .eq('is_active', true)
    .maybeSingle();

  if (!chapter) return null;

  const [{ data: resources }, { data: questions }, { data: papers }] = await Promise.all([
    db
      .from('library_resources')
      .select('id,title,description,resource_type,book_title,content_section,has_context_text')
      .eq('subject_id', subject.id)
      .eq('chapter_id', chapter.id)
      .eq('importer_status', 'approved')
      .order('resource_type')
      .order('content_section')
      .order('title'),
    db
      .from('questions')
      .select('id,question_type,text,options,marks')
      .eq('subject_id', subject.id)
      .eq('chapter_id', chapter.id)
      .eq('is_verified', true)
      .not('correct_answer', 'is', null)
      .order('question_type')
      .limit(30),
    db
      .from('past_papers')
      .select('id,year,paper_type,total_questions,duration,is_verified')
      .eq('subject_id', subject.id)
      .eq('chapter_id', chapter.id)
      .eq('is_verified', true)
      .eq('extraction_status', 'approved')
      .order('year', { ascending: false })
      .limit(15),
  ]);

  const resourceRows = (resources || []) as ResourceRow[];
  const resourceIds = resourceRows.map((resource) => resource.id);
  const { data: chunks } = resourceIds.length
    ? await db
        .from('resource_source_chunks')
        .select('resource_id,chunk_index,page_number,heading,text')
        .eq('resource_kind', 'library')
        .in('resource_id', resourceIds)
        .order('chunk_index')
        .limit(Math.min(80, Math.max(16, resourceIds.length * 2)))
    : { data: [] as ChunkRow[] };
  const resourceIds = new Set(resourceRows.map((resource) => resource.id));
  const excerptByResource = new Map<string, ChunkRow>();
  for (const chunk of (chunks || []) as ChunkRow[]) {
    if (!resourceIds.has(chunk.resource_id) || excerptByResource.has(chunk.resource_id)) continue;
    if (chunk.text.trim().length >= 120) excerptByResource.set(chunk.resource_id, chunk);
  }

  return {
    subject,
    chapter,
    resources: resourceRows,
    questions: (questions || []) as QuestionRow[],
    papers: (papers || []) as PaperRow[],
    excerpts: resourceRows
      .map((resource) => ({ resource, chunk: excerptByResource.get(resource.id) }))
      .filter((item) => item.chunk)
      .slice(0, 8),
  };
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { subjectSlug, chapterSlug } = await params;
  const topic = await getTopic(subjectSlug, chapterSlug);
  if (!topic) return { title: 'Study Topic Not Found', robots: { index: false, follow: false } };

  const title = `${topic.subject.name} ${topic.chapter.name} — Notes, MCQs, Questions & Past Papers | ilm AI`;
  const description = `Study ${topic.subject.name} ${topic.chapter.name} with chapter notes, textbook material, verified MCQs, short and long questions, and past-paper resources from ilm AI.`;

  return {
    title,
    description,
    keywords: [
      topic.subject.name,
      topic.chapter.name,
      `${topic.subject.name} notes`,
      `${topic.subject.name} MCQs`,
      `${topic.subject.name} past papers`,
      `${topic.chapter.name} notes`,
      'Pakistan students',
    ],
    alternates: { canonical: `/topics/${subjectSlug}/${chapterSlug}` },
    openGraph: { type: 'article', title, description, url: `/topics/${subjectSlug}/${chapterSlug}` },
  };
}

export default async function AcademicTopicPage({ params }: { params: Promise<Params> }) {
  const { subjectSlug, chapterSlug } = await params;
  const topic = await getTopic(subjectSlug, chapterSlug);
  if (!topic) notFound();

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://ilmai.study';
  const canonicalUrl = `${baseUrl.replace(/\/$/, '')}/topics/${subjectSlug}/${chapterSlug}`;
  const resourceGroups = topic.resources.reduce<Record<string, ResourceRow[]>>((groups, resource) => {
    const key = resource.resource_type || 'other';
    (groups[key] ||= []).push(resource);
    return groups;
  }, {});
  const questionGroups = topic.questions.reduce<Record<string, QuestionRow[]>>((groups, question) => {
    const key = (question.question_type || 'question').toLowerCase();
    (groups[key] ||= []).push(question);
    return groups;
  }, {});

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'LearningResource',
        '@id': `${canonicalUrl}#learning-resource`,
        name: `${topic.subject.name} — ${topic.chapter.name}`,
        description: topic.chapter.description || `Chapter resources for ${topic.subject.name}: ${topic.chapter.name}.`,
        url: canonicalUrl,
        inLanguage: 'en',
        isPartOf: { '@type': 'WebSite', name: 'ilm AI', url: baseUrl },
        about: { '@type': 'Thing', name: topic.chapter.name },
        educationalLevel: 'School and college study',
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'ilm AI', item: baseUrl },
          { '@type': 'ListItem', position: 2, name: 'Library', item: `${baseUrl}/library` },
          { '@type': 'ListItem', position: 3, name: topic.subject.name, item: `${baseUrl}/library/${subjectSlug}` },
          { '@type': 'ListItem', position: 4, name: topic.chapter.name, item: canonicalUrl },
        ],
      },
    ],
  };

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href={`/library/${subjectSlug}/${chapterSlug}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Open the full library chapter
          </Link>
          <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">Public study topic</span>
        </div>

        <header className="mt-6 rounded-3xl border border-border/70 bg-card/70 p-6 sm:p-8">
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">{topic.subject.name}</span>
            <span className="rounded-full border border-border px-3 py-1 text-muted-foreground">{topic.resources.length} chapter resources</span>
            <span className="rounded-full border border-border px-3 py-1 text-muted-foreground">{topic.questions.length} verified questions available</span>
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl">{topic.chapter.name}</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
            {topic.chapter.description || `Chapter-level study material for ${topic.subject.name}. Browse notes, textbook material, practice questions, and past papers below.`}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href={`/library/${subjectSlug}/${chapterSlug}`} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">
              Browse chapter resources
            </Link>
            <Link href={`/past-papers/${subjectSlug}/${chapterSlug}`} className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold">
              View past papers
            </Link>
            <a href="https://ilmai.store" className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold">
              Visit the official IlmAI Store
            </a>
          </div>
        </header>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Resources', value: topic.resources.length, icon: Library },
            { label: 'MCQs', value: questionGroups.mcq?.length || questionGroups.mcqs?.length || 0, icon: ListChecks },
            { label: 'Short/Long', value: (questionGroups.short?.length || 0) + (questionGroups.long?.length || 0), icon: FileQuestion },
            { label: 'Past Papers', value: topic.papers.length, icon: FileCheck2 },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-2xl border border-border/70 bg-card/50 p-5">
              <Icon className="h-5 w-5 text-primary" />
              <div className="mt-3 text-2xl font-bold">{value}</div>
              <div className="text-xs text-muted-foreground">{label}</div>
            </div>
          ))}
        </section>

        <section className="mt-8">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold">Notes, textbook material and chapter resources</h2>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {Object.entries(resourceGroups).map(([type, items]) => (
              <div key={type} className="rounded-2xl border border-border/70 bg-card/50 p-5">
                <h3 className="text-lg font-semibold">{type.replaceAll('_', ' ')}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{items.length} resource{items.length === 1 ? '' : 's'}</p>
                <div className="mt-4 space-y-2">
                  {items.slice(0, 12).map((resource) => (
                    <div key={resource.id} className="rounded-xl border border-border/60 p-3">
                      <div className="font-medium">{resource.title}</div>
                      {resource.book_title && <div className="mt-1 text-xs text-muted-foreground">{resource.book_title}</div>}
                      {resource.description && <p className="mt-2 text-sm leading-6 text-muted-foreground">{resource.description}</p>}
                      {resource.content_section && <div className="mt-2 text-[11px] uppercase tracking-wider text-primary">{resource.content_section}</div>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {topic.excerpts.length > 0 && (
          <section className="mt-8 rounded-3xl border border-border/70 bg-card/40 p-5 sm:p-7">
            <h2 className="text-2xl font-bold">Study excerpts from the indexed chapter material</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              These are short excerpts from approved chapter resources. Use the library reader for the complete source file.
            </p>
            <div className="mt-5 space-y-4">
              {topic.excerpts.map(({ resource, chunk }) => {
                const excerpt = chunk!.text.trim().slice(0, 1100);
                return (
                  <article key={resource.id} className="rounded-2xl border border-border/60 bg-background/50 p-5">
                    <h3 className="font-semibold">{resource.title}</h3>
                    {chunk!.heading && <div className="mt-1 text-xs text-primary">{chunk!.heading}</div>}
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{excerpt}{chunk!.text.trim().length > 1100 ? '…' : ''}</p>
                    {chunk!.page_number && <div className="mt-3 text-xs text-muted-foreground">Source page {chunk!.page_number}</div>}
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {topic.questions.length > 0 && (
          <section className="mt-8 rounded-3xl border border-border/70 bg-card/40 p-5 sm:p-7">
            <h2 className="text-2xl font-bold">Verified practice questions</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Sample questions from the verified chapter question bank.</p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {topic.questions.slice(0, 18).map((question, index) => (
                <article key={question.id} className="rounded-2xl border border-border/60 bg-background/50 p-5">
                  <div className="text-xs uppercase tracking-wider text-primary">{question.question_type || 'Question'}{question.marks ? ` · ${question.marks} marks` : ''}</div>
                  <h3 className="mt-2 font-medium leading-7">{index + 1}. {question.text}</h3>
                  {Array.isArray(question.options) && question.options.length > 0 && (
                    <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                      {(question.options as unknown[]).slice(0, 6).map((option, optionIndex) => (
                        <li key={`${question.id}-${optionIndex}`}>{String.fromCharCode(65 + optionIndex)}. {String(option)}</li>
                      ))}
                    </ul>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}

        {topic.papers.length > 0 && (
          <section className="mt-8 rounded-3xl border border-border/70 bg-card/40 p-5 sm:p-7">
            <h2 className="text-2xl font-bold">Verified past papers</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {topic.papers.map((paper) => (
                <Link key={paper.id} href={`/past-papers/${subjectSlug}/${chapterSlug}/${paper.id}`} className="rounded-2xl border border-border/60 bg-background/50 p-4 hover:border-primary/40">
                  <div className="font-semibold">{paper.year} {paper.paper_type}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {paper.total_questions ?? '—'} questions{paper.duration ? ` · ${paper.duration} min` : ''}
                  </div>
                  {paper.is_verified && <div className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-emerald-500">Verified</div>}
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="mt-8 rounded-3xl border border-primary/20 bg-primary/5 p-6">
          <h2 className="text-xl font-bold">About ilm AI study resources</h2>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            This public topic page connects chapter notes, textbook material, verified questions and past-paper resources in one place.
            Full resource files remain available through the chapter reader, while the public page keeps the academic subject and chapter context explicit.
          </p>
        </section>

        <footer className="mt-8 border-t border-border pt-6 text-sm text-muted-foreground">
          <Link href="/library" className="hover:text-foreground">Browse the public library</Link>
          <span className="mx-2">·</span>
          <a href="https://ilmai.store" className="hover:text-foreground">Official IlmAI Store</a>
        </footer>
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\u003c') }}
      />
    </main>
  );
}
