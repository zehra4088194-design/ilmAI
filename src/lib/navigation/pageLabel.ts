// Turns the current pathname into a short human-readable label the side-chat AI is told about
// ("the student is currently on the Chemistry page" / "...on the Pricing page"), so its answers
// can be scoped to where the person actually is instead of guessing from the message alone.
const STATIC_PAGE_LABELS: Array<[prefix: string, label: string]> = [
  ['/dashboard', 'Dashboard'],
  ['/study', 'Subjects'],
  ['/lectures', 'Lectures'],
  ['/library', 'Library'],
  ['/past-papers', 'Past Papers'],
  ['/ai-tutor', 'AI Tutor'],
  ['/practice', 'Adaptive Practice'],
  ['/diagnostic', 'Diagnostic Test'],
  ['/full-test', 'Full Test'],
  ['/guess-paper', 'AI Guess Paper'],
  ['/scan', 'Scan & Solve'],
  ['/mcq', 'MCQ Practice'],
  ['/student-chat', 'Study Buddies'],
  ['/downloads', 'Downloads'],
  ['/subscription', 'Pricing / Subscription'],
  ['/settings', 'Settings'],
  ['/planner', 'Smart Planner'],
  ['/flashcards', 'Flashcards'],
  ['/notes', 'My Notes'],
  ['/progress', 'Progress'],
  ['/leaderboard', 'Leaderboard'],
  ['/career', 'Career'],
  ['/insights', 'AI Insights'],
  ['/university-hub', 'University Hub'],
  ['/university/pharmapulse', 'PharmaPulse'],
  ['/university/presentation-builder', 'Presentation Builder'],
  ['/university/essay-assistant', 'Essay Assistant'],
  ['/university/assignment-helper', 'Assignment Helper'],
  ['/university/viva-practice', 'Viva Practice'],
  ['/university/research-helper', 'Research Helper'],
  ['/university/project-builder', 'Project Builder'],
  ['/university/pdf-summarizer', 'PDF Summarizer'],
  ['/university/citation-generator', 'Citation Generator'],
  ['/university/resume-builder', 'Resume Builder'],
  ['/university/semester-planner', 'Semester Planner'],
  ['/university', 'University Hub'],
  ['/class-library', 'Class Library'],
  ['/quran', 'Quran Class'],
  ['/kids', 'Kids Dashboard'],
  ['/parent', 'Parent Dashboard'],
  ['/school-admin', 'School Admin Portal'],
  ['/school', 'School Portal'],
  ['/college-admin', 'College Admin Portal'],
  ['/college', 'College Portal'],
  ['/teacher', 'Teacher Portal'],
  ['/admin', 'Platform Admin Panel'],
];

function titleCase(slug: string) {
  return slug
    .replace(/-/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function derivePageLabel(pathname: string | null | undefined): string {
  if (!pathname) return 'the app';

  // /study/<subject-slug> or /study/<subject-slug>/<chapter-slug> — name the actual subject
  // (and chapter, if present) instead of the generic "Subjects" list label.
  const studyMatch = pathname.match(/^\/study\/([^/]+)(?:\/([^/]+))?/);
  if (studyMatch?.[1]) {
    const subject = titleCase(studyMatch[1]);
    const chapter = studyMatch[2] ? titleCase(studyMatch[2]) : null;
    return chapter ? `${subject} — ${chapter} (Study)` : `${subject} (Study)`;
  }

  const staticMatch = STATIC_PAGE_LABELS.find(([prefix]) => pathname.startsWith(prefix));
  if (staticMatch) return staticMatch[1];

  // Fallback: turn the last non-empty path segment into a readable label rather than showing
  // nothing — better than silently omitting page context on a route we haven't named above.
  const segments = pathname.split('/').filter(Boolean);
  const lastSegment = segments[segments.length - 1];
  if (!lastSegment) return 'the Dashboard';
  return titleCase(lastSegment);
}
