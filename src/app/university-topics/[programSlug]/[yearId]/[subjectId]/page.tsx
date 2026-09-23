import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, BookOpen, FileQuestion, GraduationCap, Library, ListChecks } from 'lucide-react';
import { createServiceClient } from '@/lib/supabase/service';

type Params = { programSlug: string; yearId: string; subjectId: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { programSlug, yearId, subjectId } = await params;
  const db = createServiceClient();
  const [{ data: program }, { data: year }, { data: subject }, { data: link }] = await Promise.all([
    db.from('university_degree_programs').select('id,name').eq('slug', programSlug).eq('is_active', true).maybeSingle(),
    db.from('university_program_years').select('id,label,program_id').eq('id', yearId).maybeSingle(),
    db.from('university_subjects').select('id,name').eq('id', subjectId).eq('is_active', true).maybeSingle(),
    db.from('university_program_year_subjects').select('id').eq('program_year_id', yearId).eq('subject_id', subjectId).maybeSingle(),
  ]);
  if (!program || !year || !subject || !link || year.program_id !== program.id) {
    return { title: 'University Topic Not Found', robots: { index: false, follow: false } };
  }
  const title = `${subject.name} — ${program.name} ${year.label} Notes, Questions & Past Papers | ilm AI`;
  const description = `Study ${subject.name} for ${program.name} ${year.label} with available notes, books, question banks, and past-paper resources on ilm AI.`;
  return {
    title,
    description,
    keywords: [program.name, year.label, subject.name, `${subject.name} notes`, `${subject.name} past papers`, 'Pakistan university notes'],
    alternates: { canonical: `/university-topics/${programSlug}/${yearId}/${subjectId}` },
    openGraph: { type: 'article', title, description, url: `/university-topics/${programSlug}/${yearId}/${subjectId}` },
  };
}

export default async function UniversityAcademicTopicPage({ params }: { params: Promise<Params> }) {
  const { programSlug, yearId, subjectId } = await params;
  const db = createServiceClient();

  const [{ data: program }, { data: year }, { data: subject }, { data: link }] = await Promise.all([
    db.from('university_degree_programs').select('id,name,stream').eq('slug', programSlug).eq('is_active', true).maybeSingle(),
    db.from('university_program_years').select('id,label,program_id').eq('id', yearId).maybeSingle(),
    db.from('university_subjects').select('id,name').eq('id', subjectId).eq('is_active', true).maybeSingle(),
    db.from('university_program_year_subjects').select('id').eq('program_year_id', yearId).eq('subject_id', subjectId).maybeSingle(),
  ]);
  if (!program || !year || !subject || !link || year.program_id !== program.id) notFound();

  const [{ data: resources }, { data: questions }] = await Promise.all([
    db.from('university_subject_resources')
      .select('id,resource_type,title,url,sort_order')
      .eq('subject_id', subjectId)
      .order('sort_order')
      .order('created_at'),
    db.from('university_questions')
      .select('id,text,options,difficulty,marks')
      .eq('subject_id', subjectId)
      .order('created_at')
      .limit(30),
  ]);

  const resourceRows = resources || [];
  const resourceIds = resourceRows.map((resource: any) => resource.id);
  const { data: contents } = resourceIds.length
    ? await db.from('university_resource_contents')
        .select('resource_id,content,source_path')
        .in('resource_id', resourceIds)
    : { data: [] as any[] };
  const contentByResource = new Map<string, any>((contents || []).map((item: any) => [item.resource_id, item]));

  const groupedResources = resourceRows.reduce<Record<string, any[]>>((groups, resource: any) => {
    (groups[resource.resource_type] ||= []).push(resource);
    return groups;
  }, {});

  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://ilmai.study').replace(/\/$/, '');
  const canonicalUrl = `${baseUrl}/university-topics/${programSlug}/${yearId}/${subjectId}`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'LearningResource',
        '@id': `${canonicalUrl}#learning-resource`,
        name: `${subject.name} — ${program.name} ${year.label}`,
        description: `University study resources for ${subject.name} in ${program.name} ${year.label}.`,
        url: canonicalUrl,
        isPartOf: { '@type': 'WebSite', name: 'ilm AI', url: baseUrl },
        educationalLevel: 'University',
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'ilm AI', item: baseUrl },
          { '@type': 'ListItem', position: 2, name: 'University Topics', item: `${baseUrl}/university-topics` },
          { '@type': 'ListItem', position: 3, name: program.name, item: `${baseUrl}/university-topics` },
          { '@type': 'ListItem', position: 4, name: subject.name, item: canonicalUrl },
        ],
      },
    ],
  };

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/university-topics" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> All university topics
        </Link>

        <header className="mt-6 rounded-3xl border border-border/70 bg-card/70 p-6 sm:p-8">
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">{program.name}</span>
            <span className="rounded-full border border-border px-3 py-1 text-muted-foreground">{year.label}</span>
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl">{subject.name}</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
            Public university study resources for {subject.name}, including available notes, books, past papers, question banks and indexed source material.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a href="https://ilmai.store" className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold">Visit the official IlmAI Store</a>
            <Link href="/university-hub" className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold">Open University Hub</Link>
          </div>
        </header>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-border/70 bg-card/50 p-5"><Library className="h-5 w-5 text-primary" /><div className="mt-3 text-2xl font-bold">{resourceRows.length}</div><div className="text-xs text-muted-foreground">Resources</div></div>
          <div className="rounded-2xl border border-border/70 bg-card/50 p-5"><FileQuestion className="h-5 w-5 text-primary" /><div className="mt-3 text-2xl font-bold">{(questions || []).length}</div><div className="text-xs text-muted-foreground">Questions</div></div>
          <div className="rounded-2xl border border-border/70 bg-card/50 p-5"><GraduationCap className="h-5 w-5 text-primary" /><div className="mt-3 text-2xl font-bold">University</div><div className="text-xs text-muted-foreground">{program.stream || 'Study topic'}</div></div>
        </section>

        <section className="mt-8">
          <div className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary" /><h2 className="text-2xl font-bold">Subject resources</h2></div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {Object.entries(groupedResources).map(([type, items]) => (
              <div key={type} className="rounded-2xl border border-border/70 bg-card/50 p-5">
                <h3 className="text-lg font-semibold">{type.replaceAll('_', ' ')}</h3>
                <div className="mt-1 text-xs text-muted-foreground">{items.length} resource{items.length === 1 ? '' : 's'}</div>
                <div className="mt-4 space-y-3">
                  {items.slice(0, 12).map((resource: any) => {
                    const content = contentByResource.get(resource.id);
                    const excerpt = content?.content?.trim().slice(0, 900);
                    return (
                      <article key={resource.id} className="rounded-xl border border-border/60 p-4">
                        <h4 className="font-semibold">{resource.title}</h4>
                        {excerpt && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{excerpt}{content.content.trim().length > 900 ? '…' : ''}</p>}
                      </article>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        {!!(questions || []).length && (
          <section className="mt-8 rounded-3xl border border-border/70 bg-card/40 p-5 sm:p-7">
            <div className="flex items-center gap-2"><ListChecks className="h-5 w-5 text-primary" /><h2 className="text-2xl font-bold">University practice questions</h2></div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {(questions || []).slice(0, 18).map((question: any, index: number) => (
                <article key={question.id} className="rounded-2xl border border-border/60 bg-background/50 p-5">
                  <div className="text-xs uppercase tracking-wider text-primary">{question.difficulty || 'Question'}{question.marks ? ` · ${question.marks} marks` : ''}</div>
                  <h3 className="mt-2 font-medium leading-7">{index + 1}. {question.text}</h3>
                  {Array.isArray(question.options) && question.options.length > 0 && (
                    <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                      {question.options.slice(0, 6).map((option: any, optionIndex: number) => (
                        <li key={`${question.id}-${optionIndex}`}>{String.fromCharCode(65 + optionIndex)}. {typeof option === 'object' ? option.text || option.label || JSON.stringify(option) : String(option)}</li>
                      ))}
                    </ul>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}

        <footer className="mt-8 border-t border-border pt-6 text-sm text-muted-foreground">
          Public topic page for {subject.name}. <a href="https://ilmai.store" className="hover:text-foreground">Official IlmAI Store</a> · <Link href="https://ilmai.study" className="hover:text-foreground">ilm AI study platform</Link>
        </footer>
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
    </main>
  );
}
