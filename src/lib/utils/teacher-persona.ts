export interface TeacherPersona {
  name: string;
  specialty: string;
  bio: string;
  initials: string;
  gradient: string; // tailwind gradient classes
}

// Client-side persona roster keyed by subject name (lowercase, partial match).
// The actual reply is still generated and attributed by a single AI-operated
// teacher account in the DB — this roster just gives students a believable,
// consistent "who's answering" identity per subject on the frontend.
const ROSTER: Record<string, TeacherPersona> = {
  math: { name: 'Sir Zeeshan', specialty: 'Mathematics Specialist', bio: '10+ years teaching FBISE & Cambridge Math', initials: 'ZS', gradient: 'from-violet-500 to-indigo-600' },
  physics: { name: 'Sir Zafar', specialty: 'Physics Specialist', bio: '8+ years experience, FSc & O/A Level Physics', initials: 'ZF', gradient: 'from-blue-500 to-cyan-600' },
  chemistry: { name: 'Miss Ayesha', specialty: 'Chemistry Specialist', bio: 'Organic & inorganic chemistry expert', initials: 'AY', gradient: 'from-emerald-500 to-teal-600' },
  biology: { name: 'Dr. Hina', specialty: 'Biology Specialist', bio: 'MBBS, loves making biology click', initials: 'HN', gradient: 'from-pink-500 to-rose-600' },
  english: { name: 'Miss Sara', specialty: 'English Specialist', bio: 'Grammar, comprehension & essay writing', initials: 'SR', gradient: 'from-amber-500 to-orange-600' },
  urdu: { name: 'Sir Kashif', specialty: 'Urdu Specialist', bio: 'Specialist in literature and grammar', initials: 'KF', gradient: 'from-fuchsia-500 to-purple-600' },
  computer: { name: 'Sir Bilal', specialty: 'Computer Science Specialist', bio: 'Programming & CS fundamentals expert', initials: 'BL', gradient: 'from-slate-500 to-zinc-700' },
  islamiyat: { name: 'Sir Usman', specialty: 'Islamiyat Specialist', bio: 'Islamic studies, clear & thoughtful', initials: 'US', gradient: 'from-green-600 to-emerald-700' },
  pakistan: { name: 'Miss Fatima', specialty: 'Pakistan Studies Specialist', bio: 'History & civics made simple', initials: 'FT', gradient: 'from-teal-500 to-green-600' },
  default: { name: 'Team ilm AI', specialty: 'General Tutor', bio: 'Here to help with any subject', initials: 'IA', gradient: 'from-violet-500 to-indigo-600' },
};

const DEFAULT_PERSONA = ROSTER.default!;

export function getTeacherPersona(subjectName?: string | null): TeacherPersona {
  if (!subjectName) return DEFAULT_PERSONA;
  const key = subjectName.toLowerCase();
  const match = Object.keys(ROSTER).find((k) => key.includes(k));
  return match ? ROSTER[match]! : DEFAULT_PERSONA;
}
