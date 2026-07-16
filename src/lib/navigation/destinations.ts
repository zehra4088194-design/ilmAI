export type AppDestination = {
  label: string;
  href: string;
  keywords: string[];
};

export const APP_DESTINATIONS: AppDestination[] = [
  { label: 'Open Dashboard', href: '/dashboard', keywords: ['dashboard', 'home'] },
  { label: 'Open Subjects', href: '/study', keywords: ['subject', 'chapter', 'study', 'parhai'] },
  { label: 'Open Lectures', href: '/lectures', keywords: ['lecture', 'video', 'class'] },
  { label: 'Open Library', href: '/library', keywords: ['library', 'book', 'textbook', 'notes', 'kitab'] },
  { label: 'Open Past Papers', href: '/past-papers', keywords: ['past paper', 'paper'] },
  { label: 'Open AI Tutor', href: '/ai-tutor', keywords: ['ai tutor', 'tutor', 'teacher', 'samjhao'] },
  { label: 'Start AI Testing', href: '/practice', keywords: ['practice', 'testing', 'test practice'] },
  { label: 'Open Full Test', href: '/full-test', keywords: ['full test', 'exam test'] },
  { label: 'Open Guess Paper', href: '/guess-paper', keywords: ['guess paper', 'guess'] },
  { label: 'Open Scan & Solve', href: '/scan', keywords: ['scan', 'photo', 'camera', 'solve image'] },
  { label: 'Open Study Buddies', href: '/student-chat', keywords: ['buddy', 'buddies', 'student chat', 'friend'] },
  { label: 'Link Parent', href: '/settings?tab=parent-link', keywords: ['parent link', 'parent', 'qr'] },
  { label: 'Open Downloads', href: '/downloads', keywords: ['download', 'offline', 'saved'] },
  { label: 'View Plans', href: '/subscription', keywords: ['subscription', 'plan', 'pro', 'elite', 'price'] },
  { label: 'Open Settings', href: '/settings', keywords: ['setting', 'profile', 'gender', 'theme'] },
  { label: 'Open Planner', href: '/planner/today', keywords: ['planner', 'routine', 'schedule'] },
  { label: 'Open Flashcards', href: '/flashcards', keywords: ['flashcard', 'card'] },
  { label: 'Open My Notes', href: '/notes', keywords: ['my note', 'write note'] },
  { label: 'Open Progress', href: '/progress', keywords: ['progress', 'analytics', 'marks'] },
  { label: 'Open University Hub', href: '/university', keywords: ['university', 'semester', 'degree'] },
];

export function getDestinationSuggestions(query: string, limit = 3) {
  const normalized = query.toLowerCase();
  return APP_DESTINATIONS.filter((destination) =>
    destination.keywords.some((keyword) => normalized.includes(keyword))
  ).slice(0, limit);
}
