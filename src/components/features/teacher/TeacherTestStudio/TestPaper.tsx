import Image from 'next/image';
import type { Mcq, Paper, Question } from './types';
import { formatGrade } from './types';

// Shared watermark/branding overlay — renders the forced ilm AI mark and/or
// an ELITE teacher's custom watermark text/image. Never blocks question text
// (low opacity, pointer-events none, positioned behind content).
function Watermark({ paper }: { paper: Paper }) {
  const { branding } = paper;
  return (
    <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center overflow-hidden">
      {branding.forceIlmAiWatermark && (
        <Image src="/icons/icon-512.png" alt="" width={360} height={360} className="opacity-[0.045]" />
      )}
      {branding.customWatermarkImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- arbitrary teacher-supplied URL, not a Next-optimizable local asset
        <img
          src={branding.customWatermarkImageUrl}
          alt=""
          className="absolute h-64 w-64 object-contain opacity-[0.08]"
        />
      )}
      {branding.customWatermarkText && (
        <p className="absolute rotate-[-30deg] text-5xl font-black tracking-widest whitespace-nowrap opacity-[0.06] select-none">
          {branding.customWatermarkText}
        </p>
      )}
    </div>
  );
}

// PRO/ELITE teachers and principals get their own saved institution logo/name used automatically
// (see initialInstitutionName/initialLogoUrl in TeacherTestStudio) — when one is set, it becomes
// the paper's main header mark instead of the ilm AI logo. ilm AI still credits itself, just as a
// small text mark off to the side rather than the big center logo, unless hidePlatformBranding
// (ELITE-only, a bigger ask than this) removes it entirely.
function HeaderBrandMark({ paper, size = 'md' }: { paper: Paper; size?: 'sm' | 'md' }) {
  const { branding } = paper;
  const hasCustomLogo = !!branding.customWatermarkImageUrl;
  if (branding.hidePlatformBranding && !hasCustomLogo) return null;
  const logoPx = size === 'sm' ? 18 : 20;
  const customLogoClass = size === 'sm' ? 'h-6 w-6' : 'h-7 w-7';
  const wordmarkClass = size === 'sm' ? 'text-[11px]' : 'text-xs';
  const sideMarkClass = size === 'sm' ? 'text-[7px]' : 'text-[8px]';

  return (
    <div className="relative flex items-center justify-center">
      {hasCustomLogo ? (
        // eslint-disable-next-line @next/next/no-img-element -- arbitrary teacher/school-supplied URL
        <img src={branding.customWatermarkImageUrl!} alt="" className={`${customLogoClass} object-contain`} />
      ) : (
        !branding.hidePlatformBranding && (
          <div className="flex items-center gap-1.5">
            <Image src="/icons/icon-192.png" alt="Ilm AI" width={logoPx} height={logoPx} />
            <h1 className={`${wordmarkClass} font-black tracking-tight`}>Ilm AI</h1>
          </div>
        )
      )}
      {hasCustomLogo && !branding.hidePlatformBranding && (
        <span className={`absolute right-0 ${sideMarkClass} font-semibold whitespace-nowrap text-slate-500`}>
          Powered by ilmai.study
        </span>
      )}
    </div>
  );
}

function StudentFields({ paper }: { paper: Paper }) {
  return (
    <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-left text-[11px] font-semibold sm:grid-cols-4">
      <span>Name: ______________________</span>
      <span>Roll No: ________________</span>
      <span>Date: ____ / ____ / ______</span>
      <span className="sm:text-right">Marks: {paper.totalMarks}</span>
    </div>
  );
}

function McqBlock({ question, index }: { question: Mcq; index: number }) {
  return (
    <div className="mb-1.5 break-inside-avoid text-xs">
      <p className="font-semibold whitespace-pre-wrap">
        {index + 1}. {question.q}
      </p>
      <div className="mt-0.5 grid grid-cols-2 gap-x-5 gap-y-0.5 pl-3">
        {question.opts.map((option, optionIndex) => (
          <span key={option} className="whitespace-pre-wrap">
            {String.fromCharCode(65 + optionIndex)}. {option}
          </span>
        ))}
      </div>
    </div>
  );
}

function SubjectiveBlock({ question, index }: { question: Question; index: number }) {
  return (
    <p className="mb-2.5 break-inside-avoid text-xs leading-5 font-semibold whitespace-pre-wrap">
      {index + 1}. {question.q} <span className="float-right font-normal">[{question.marks}]</span>
    </p>
  );
}

function AnswerKey({ paper }: { paper: Paper }) {
  if (!paper.includeAnswerKey) return null;
  return (
    <section className="mt-4 break-before-page">
      <h2 className="mb-2 border-b-2 pb-1 text-base font-black">Teacher Answer Key</h2>
      {paper.mcqs.length > 0 && (
        <p className="mb-2 text-xs">
          <strong>MCQs:</strong>{' '}
          {paper.mcqs.map((question, index) => `${index + 1}-${String.fromCharCode(65 + question.correct)}`).join(', ')}
        </p>
      )}
      {[...paper.shortQuestions, ...paper.longQuestions, ...paper.letterQuestions, ...paper.vocabQuestions, ...paper.grammarQuestions, ...paper.numericalQuestions, ...paper.extraQuestions].map((question, index) => (
        <div key={`${question.q}-${index}`} className="mt-2 break-inside-avoid text-xs">
          <p className="font-bold whitespace-pre-wrap">
            {index + 1}. {question.q}
          </p>
          <p className="mt-0.5 leading-5 whitespace-pre-wrap">
            {question.modelAnswer ||
              question.keyPoints.join(' ') ||
              'Model answer not available — mark from the chapter source.'}
          </p>
        </div>
      ))}
    </section>
  );
}

function PrintStyles({ id }: { id: string }) {
  return (
    <style jsx global>{`
      @page {
        size: A4;
        margin: 0;
      }
      @media print {
        body * {
          visibility: hidden !important;
        }
        #${id}, #${id} * {
          visibility: visible !important;
        }
        #${id} {
          /* Only 'top'/'left' are pinned (not 'inset: 0') — with 'bottom' also set and
             'height' left auto, the box's height resolves to exactly one page (297mm)
             regardless of content, and the article's own 'overflow-hidden' class then
             silently clips every page after the first. Pinning only the top-left corner
             keeps the height content-driven so a long paper actually flows onto as many
             A4 pages as it needs, instead of truncating to one. */
          position: absolute;
          top: 0;
          left: 0;
          width: 210mm;
          min-height: 297mm;
          padding: 14mm;
          overflow: visible !important;
          print-color-adjust: exact;
          -webkit-print-color-adjust: exact;
        }
      }
    `}</style>
  );
}

// ---------------------------------------------------------------------------
// Theme: classic — the original textured "exam sheet" look with gold rules.
// ---------------------------------------------------------------------------
function ClassicPaper({ paper }: { paper: Paper }) {
  return (
    <article
      id="teacher-test-paper"
      className="relative mx-auto min-h-[1120px] max-w-[794px] overflow-hidden rounded-lg border bg-cover bg-top p-6 text-slate-950 shadow-2xl sm:p-8 print:min-h-0 print:max-w-none print:rounded-none print:border-0 print:shadow-none"
      style={{ backgroundImage: 'url(/test-paper/bg-light.webp)' }}
    >
      <Watermark paper={paper} />
      <div className="relative z-10">
        <header className="border-b-2 border-[#d9a441] pb-2 text-center">
          <HeaderBrandMark paper={paper} />
          {paper.institutionName && (
            <p className="mt-1 text-sm font-bold tracking-[0.1em] uppercase">{paper.institutionName}</p>
          )}
          <h2 className="mt-1 text-base font-extrabold text-[#d9a441]">{paper.title}</h2>
          <p className="mt-0.5 text-xs">
            {formatGrade(paper.gradeLevel)} | {paper.subject.name} | {paper.chapter.name} | {paper.timeAllowed} minutes
          </p>
          <StudentFields paper={paper} />
        </header>

        {paper.mcqs.length > 0 && (
          <section className="mt-3">
            <h2 className="mb-1.5 border-b border-[#d9a441]/70 pb-1 text-sm font-black">
              Section A — Multiple Choice Questions
            </h2>
            {paper.mcqs.map((question, index) => (
              <McqBlock key={`${question.q}-${index}`} question={question} index={index} />
            ))}
          </section>
        )}
        {paper.shortQuestions.length > 0 && (
          <section className="mt-3">
            <h2 className="mb-1.5 border-b border-[#d9a441]/70 pb-1 text-sm font-black">Section B — Short Questions</h2>
            {paper.shortQuestions.map((question, index) => (
              <SubjectiveBlock key={`${question.q}-${index}`} question={question} index={index} />
            ))}
          </section>
        )}
        {paper.longQuestions.length > 0 && (
          <section className="mt-3">
            <h2 className="mb-1.5 border-b border-[#d9a441]/70 pb-1 text-sm font-black">Section C — Long Questions</h2>
            {paper.longQuestions.map((question, index) => (
              <SubjectiveBlock key={`${question.q}-${index}`} question={question} index={index} />
            ))}
          </section>
        )}
        {paper.letterQuestions.length > 0 && (
          <section className="mt-3">
            <h2 className="mb-1.5 border-b border-[#d9a441]/70 pb-1 text-sm font-black">Section D — Letters & Applications</h2>
            {paper.letterQuestions.map((question, index) => (
              <SubjectiveBlock key={`${question.q}-${index}`} question={question} index={index} />
            ))}
          </section>
        )}
        {paper.vocabQuestions.length > 0 && (
          <section className="mt-3">
            <h2 className="mb-1.5 border-b border-[#d9a441]/70 pb-1 text-sm font-black">Section E — Vocabulary</h2>
            {paper.vocabQuestions.map((question, index) => (
              <SubjectiveBlock key={`${question.q}-${index}`} question={question} index={index} />
            ))}
          </section>
        )}
        {paper.grammarQuestions.length > 0 && (
          <section className="mt-3">
            <h2 className="mb-1.5 border-b border-[#d9a441]/70 pb-1 text-sm font-black">Section F — Grammar</h2>
            {paper.grammarQuestions.map((question, index) => (
              <SubjectiveBlock key={`${question.q}-${index}`} question={question} index={index} />
            ))}
          </section>
        )}
        {paper.numericalQuestions.length > 0 && (
          <section className="mt-3">
            <h2 className="mb-1.5 border-b border-[#d9a441]/70 pb-1 text-sm font-black">Section G — Numericals</h2>
            {paper.numericalQuestions.map((question, index) => (
              <SubjectiveBlock key={`${question.q}-${index}`} question={question} index={index} />
            ))}
          </section>
        )}
        {paper.extraQuestions.length > 0 && (
          <section className="mt-3">
            <h2 className="mb-1.5 border-b border-[#d9a441]/70 pb-1 text-sm font-black">Section H — Additional Questions</h2>
            {paper.extraQuestions.map((question, index) => (
              <SubjectiveBlock key={`${question.q}-${index}`} question={question} index={index} />
            ))}
          </section>
        )}
        <AnswerKey paper={paper} />
        {!paper.branding.hidePlatformBranding && (
          <footer className="mt-4 flex justify-between border-t border-[#d9a441]/70 pt-2 text-[9px] font-semibold">
            <span>www.ilmai.study</span>
            <span>information@ilmai.study</span>
          </footer>
        )}
      </div>
      <PrintStyles id="teacher-test-paper" />
    </article>
  );
}

// ---------------------------------------------------------------------------
// Theme: modern — clean white paper, boxed sections, pill badges, no texture.
// ---------------------------------------------------------------------------
function ModernPaper({ paper }: { paper: Paper }) {
  return (
    <article
      id="teacher-test-paper"
      className="relative mx-auto min-h-[1120px] max-w-[794px] overflow-hidden rounded-lg border bg-white p-6 text-slate-950 shadow-2xl sm:p-8 print:min-h-0 print:max-w-none print:rounded-none print:border-0 print:shadow-none"
    >
      <Watermark paper={paper} />
      <div className="relative z-10">
        <header className="rounded-xl border-2 border-slate-900 p-2.5 text-center">
          <HeaderBrandMark paper={paper} size="sm" />
          {paper.institutionName && (
            <p className="mt-0.5 text-sm font-extrabold tracking-tight">{paper.institutionName}</p>
          )}
          <h2 className="mt-1 inline-block rounded-full bg-slate-900 px-3 py-0.5 text-xs font-bold text-white">
            {paper.title}
          </h2>
          <p className="mt-1 text-xs text-slate-600">
            {formatGrade(paper.gradeLevel)} &middot; {paper.subject.name} &middot; {paper.chapter.name}
          </p>
          <StudentFields paper={paper} />
          <div className="mt-1 flex justify-center gap-4 text-[11px] font-semibold text-slate-600">
            <span>Duration: {paper.timeAllowed} min</span>
          </div>
        </header>

        {paper.mcqs.length > 0 && (
          <section className="mt-3 rounded-xl border border-slate-300 p-3">
            <h2 className="mb-1.5 text-sm font-black text-slate-900">
              <span className="mr-2 rounded bg-slate-900 px-2 py-0.5 text-[10px] text-white">A</span>
              Multiple Choice Questions
            </h2>
            {paper.mcqs.map((question, index) => (
              <McqBlock key={`${question.q}-${index}`} question={question} index={index} />
            ))}
          </section>
        )}
        {paper.shortQuestions.length > 0 && (
          <section className="mt-3 rounded-xl border border-slate-300 p-3">
            <h2 className="mb-1.5 text-sm font-black text-slate-900">
              <span className="mr-2 rounded bg-slate-900 px-2 py-0.5 text-[10px] text-white">B</span>
              Short Questions
            </h2>
            {paper.shortQuestions.map((question, index) => (
              <SubjectiveBlock key={`${question.q}-${index}`} question={question} index={index} />
            ))}
          </section>
        )}
        {paper.longQuestions.length > 0 && (
          <section className="mt-3 rounded-xl border border-slate-300 p-3">
            <h2 className="mb-1.5 text-sm font-black text-slate-900">
              <span className="mr-2 rounded bg-slate-900 px-2 py-0.5 text-[10px] text-white">C</span>
              Long Questions
            </h2>
            {paper.longQuestions.map((question, index) => (
              <SubjectiveBlock key={`${question.q}-${index}`} question={question} index={index} />
            ))}
          </section>
        )}
        {paper.letterQuestions.length > 0 && (
          <section className="mt-3 rounded-xl border border-slate-300 p-3">
            <h2 className="mb-1.5 text-sm font-black text-slate-900">
              <span className="mr-2 rounded bg-slate-900 px-2 py-0.5 text-[10px] text-white">D</span>
              Letters & Applications
            </h2>
            {paper.letterQuestions.map((question, index) => (
              <SubjectiveBlock key={`${question.q}-${index}`} question={question} index={index} />
            ))}
          </section>
        )}
        {paper.vocabQuestions.length > 0 && (
          <section className="mt-3 rounded-xl border border-slate-300 p-3">
            <h2 className="mb-1.5 text-sm font-black text-slate-900">
              <span className="mr-2 rounded bg-slate-900 px-2 py-0.5 text-[10px] text-white">E</span>
              Vocabulary
            </h2>
            {paper.vocabQuestions.map((question, index) => (
              <SubjectiveBlock key={`${question.q}-${index}`} question={question} index={index} />
            ))}
          </section>
        )}
        {paper.grammarQuestions.length > 0 && (
          <section className="mt-3 rounded-xl border border-slate-300 p-3">
            <h2 className="mb-1.5 text-sm font-black text-slate-900">
              <span className="mr-2 rounded bg-slate-900 px-2 py-0.5 text-[10px] text-white">F</span>
              Grammar
            </h2>
            {paper.grammarQuestions.map((question, index) => (
              <SubjectiveBlock key={`${question.q}-${index}`} question={question} index={index} />
            ))}
          </section>
        )}
        {paper.numericalQuestions.length > 0 && (
          <section className="mt-3 rounded-xl border border-slate-300 p-3">
            <h2 className="mb-1.5 text-sm font-black text-slate-900">
              <span className="mr-2 rounded bg-slate-900 px-2 py-0.5 text-[10px] text-white">G</span>
              Numericals
            </h2>
            {paper.numericalQuestions.map((question, index) => (
              <SubjectiveBlock key={`${question.q}-${index}`} question={question} index={index} />
            ))}
          </section>
        )}
        {paper.extraQuestions.length > 0 && (
          <section className="mt-3 rounded-xl border border-slate-300 p-3">
            <h2 className="mb-1.5 text-sm font-black text-slate-900">
              <span className="mr-2 rounded bg-slate-900 px-2 py-0.5 text-[10px] text-white">H</span>
              Additional Questions
            </h2>
            {paper.extraQuestions.map((question, index) => (
              <SubjectiveBlock key={`${question.q}-${index}`} question={question} index={index} />
            ))}
          </section>
        )}
        <AnswerKey paper={paper} />
        {!paper.branding.hidePlatformBranding && (
          <footer className="mt-4 flex justify-between border-t pt-2 text-[9px] font-semibold text-slate-500">
            <span>www.ilmai.study</span>
            <span>information@ilmai.study</span>
          </footer>
        )}
      </div>
      <PrintStyles id="teacher-test-paper" />
    </article>
  );
}

// ---------------------------------------------------------------------------
// Theme: minimal — plain board-style paper, ink-friendly, sparse rules.
// ---------------------------------------------------------------------------
function MinimalPaper({ paper }: { paper: Paper }) {
  return (
    <article
      id="teacher-test-paper"
      className="relative mx-auto min-h-[1120px] max-w-[794px] overflow-hidden border bg-white p-6 text-slate-900 shadow-2xl sm:p-8 print:min-h-0 print:max-w-none print:border-0 print:shadow-none"
    >
      <Watermark paper={paper} />
      <div className="relative z-10">
        <header className="text-center">
          {paper.institutionName && <p className="text-sm font-bold uppercase">{paper.institutionName}</p>}
          <h2 className="mt-0.5 text-sm font-semibold">{paper.title}</h2>
          <p className="mt-0.5 text-xs">
            {formatGrade(paper.gradeLevel)} &nbsp;|&nbsp; {paper.subject.name} &nbsp;|&nbsp; {paper.chapter.name}
          </p>
          <div className="mt-1.5 border-t border-b border-slate-900 py-1">
            <StudentFields paper={paper} />
          </div>
          <p className="mt-1 text-[11px]">
            Time Allowed: {paper.timeAllowed} minutes &nbsp;&nbsp; Total Marks: {paper.totalMarks}
          </p>
          {!paper.branding.hidePlatformBranding && (
            <p className="mt-0.5 text-[9px] text-slate-500">ilm AI Study &middot; www.ilmai.study</p>
          )}
        </header>

        {paper.mcqs.length > 0 && (
          <section className="mt-3">
            <h2 className="mb-1.5 text-xs font-bold underline">SECTION A — Multiple Choice Questions</h2>
            {paper.mcqs.map((question, index) => (
              <McqBlock key={`${question.q}-${index}`} question={question} index={index} />
            ))}
          </section>
        )}
        {paper.shortQuestions.length > 0 && (
          <section className="mt-3">
            <h2 className="mb-1.5 text-xs font-bold underline">SECTION B — Short Questions</h2>
            {paper.shortQuestions.map((question, index) => (
              <SubjectiveBlock key={`${question.q}-${index}`} question={question} index={index} />
            ))}
          </section>
        )}
        {paper.longQuestions.length > 0 && (
          <section className="mt-3">
            <h2 className="mb-1.5 text-xs font-bold underline">SECTION C — Long Questions</h2>
            {paper.longQuestions.map((question, index) => (
              <SubjectiveBlock key={`${question.q}-${index}`} question={question} index={index} />
            ))}
          </section>
        )}
        {paper.letterQuestions.length > 0 && (
          <section className="mt-3">
            <h2 className="mb-1.5 text-xs font-bold underline">SECTION D — Letters & Applications</h2>
            {paper.letterQuestions.map((question, index) => (
              <SubjectiveBlock key={`${question.q}-${index}`} question={question} index={index} />
            ))}
          </section>
        )}
        {paper.vocabQuestions.length > 0 && (
          <section className="mt-3">
            <h2 className="mb-1.5 text-xs font-bold underline">SECTION E — Vocabulary</h2>
            {paper.vocabQuestions.map((question, index) => (
              <SubjectiveBlock key={`${question.q}-${index}`} question={question} index={index} />
            ))}
          </section>
        )}
        {paper.grammarQuestions.length > 0 && (
          <section className="mt-3">
            <h2 className="mb-1.5 text-xs font-bold underline">SECTION F — Grammar</h2>
            {paper.grammarQuestions.map((question, index) => (
              <SubjectiveBlock key={`${question.q}-${index}`} question={question} index={index} />
            ))}
          </section>
        )}
        {paper.numericalQuestions.length > 0 && (
          <section className="mt-3">
            <h2 className="mb-1.5 text-xs font-bold underline">SECTION G — Numericals</h2>
            {paper.numericalQuestions.map((question, index) => (
              <SubjectiveBlock key={`${question.q}-${index}`} question={question} index={index} />
            ))}
          </section>
        )}
        {paper.extraQuestions.length > 0 && (
          <section className="mt-3">
            <h2 className="mb-1.5 text-xs font-bold underline">SECTION H — Additional Questions</h2>
            {paper.extraQuestions.map((question, index) => (
              <SubjectiveBlock key={`${question.q}-${index}`} question={question} index={index} />
            ))}
          </section>
        )}
        <AnswerKey paper={paper} />
      </div>
      <PrintStyles id="teacher-test-paper" />
    </article>
  );
}

export function TestPaper({ paper }: { paper: Paper }) {
  if (paper.theme === 'modern') return <ModernPaper paper={paper} />;
  if (paper.theme === 'minimal') return <MinimalPaper paper={paper} />;
  return <ClassicPaper paper={paper} />;
}
