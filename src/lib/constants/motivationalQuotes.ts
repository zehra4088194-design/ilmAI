// Pool of short study-motivation lines, used by the daily study email/notification
// (src/app/api/cron/daily-study-emails/route.ts) so the "Motivation" line is a random
// pick every day instead of the same repeated sentence. Previously the AI-generated
// email's fallback (used whenever the AI call fails) was one hardcoded sentence — since
// the AI call fails often enough in practice, most students were actually seeing that
// exact same line every single day. Picking randomly from this pool fixes that even
// when the AI call fails, not just on the happy path.
export const MOTIVATIONAL_QUOTES: string[] = [
  'Small, consistent study sessions lead to meaningful improvement.',
  "You don't have to be perfect today — just a little better than yesterday.",
  'Every question you solve, right or wrong, teaches you something.',
  'Discipline beats motivation on the days motivation doesn’t show up.',
  'Your future self is built by what you do in these next 25 minutes.',
  'Progress hides in boring, repeated effort — keep showing up.',
  'One focused hour today is worth more than five distracted ones.',
  'Mistakes on practice questions are cheaper than mistakes on exam day.',
  'You are not behind — you are exactly where your effort has taken you so far.',
  'The topic you keep avoiding is usually the one worth studying first.',
  'A short study session you actually do beats a long one you keep postponing.',
  'Confidence on exam day is just practice you forgot you did.',
  'Every expert was once a beginner who refused to give up.',
  'Your streak is proof that you show up — protect it today.',
  'Understanding beats memorizing — slow down on the parts that confuse you.',
  'The best time to review your weak topic was yesterday. The next best time is now.',
  'Study like the exam is tomorrow; review like you have all the time in the world.',
  'You don’t need to feel ready to start — starting is what makes you ready.',
  'Tired is normal. Quitting is a choice. Choose to keep going.',
  'Compare yourself only to who you were last week.',
  'A clear plan for 25 minutes beats a vague plan for the whole day.',
  'Every past paper you attempt makes the real exam feel more familiar.',
  'You are allowed to rest. You are not allowed to give up.',
  'The gap between where you are and where you want to be is called effort.',
  'One more revision. One more question. One more page. That’s all today needs.',
];

export function randomMotivationalQuote(): string {
  return MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)]!;
}
