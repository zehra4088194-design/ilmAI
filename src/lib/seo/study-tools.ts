export const PUBLIC_STUDY_TOOLS = {
  notes: {
    name: 'Study Notes',
    shortName: 'Notes',
    description:
      'Create, organise, and revise subject notes with focused study tools for school, college, and university courses.',
    heading: 'Keep every important note ready for revision',
    intro:
      'Build a personal notes collection, organise material by topic, and return to the exact concepts you need before a test.',
    benefits: ['Organised personal notes', 'Quick revision by subject', 'Private account-based workspace'],
    destination: '/notes',
    action: 'Open Notes',
  },
  lectures: {
    name: 'Video Lectures',
    shortName: 'Lectures',
    description: 'Browse curriculum-aligned video lectures by subject and chapter for focused concept revision.',
    heading: 'Learn chapter concepts through focused lectures',
    intro:
      'Find lectures by subject and chapter, then continue into related library material and practice without losing your place.',
    benefits: ['Subject and chapter organisation', 'Focused concept revision', 'Connected study resources'],
    destination: '/lectures',
    action: 'Browse Lectures',
  },
  'ai-tutor': {
    name: 'AI Tutor',
    shortName: 'AI Tutor',
    description:
      'Ask study questions and receive structured explanations, worked steps, and revision support from the ilm AI Tutor.',
    heading: 'Ask questions and understand the working',
    intro:
      'Use the AI Tutor for explanations, numericals, follow-up questions, and concise revision help across school and university subjects.',
    benefits: ['Step-by-step explanations', 'English and Roman Urdu support', 'Subject-aware follow-up questions'],
    destination: '/ai-tutor',
    action: 'Open AI Tutor',
  },
  'presentation-builder': {
    name: 'AI Presentation Builder',
    shortName: 'Presentation Builder',
    description:
      'Turn a university topic into a structured slide deck with key points, speaker notes, and presentation-ready organisation.',
    heading: 'Build a clear presentation from your topic',
    intro:
      'Generate a structured academic presentation draft, review each slide, and refine the content before presenting or exporting it.',
    benefits: ['Structured slide outlines', 'Speaker notes and key points', 'Editable academic draft'],
    destination: '/university/presentation-builder',
    action: 'Build a Presentation',
  },
} as const;

export type PublicStudyToolSlug = keyof typeof PUBLIC_STUDY_TOOLS;

export function isPublicStudyToolSlug(value: string): value is PublicStudyToolSlug {
  return value in PUBLIC_STUDY_TOOLS;
}

export const PRIMARY_SITE_LINKS = [
  { name: 'Notes', url: '/features/notes' },
  { name: 'Lectures', url: '/features/lectures' },
  { name: 'Library', url: '/library' },
  { name: 'AI Tutor', url: '/features/ai-tutor' },
  { name: 'Presentation Builder', url: '/features/presentation-builder' },
] as const;
