export type StudyToolImage = { src: string; alt: string };

export type StudyTool = {
  name: string;
  shortName: string;
  description: string;
  heading: string;
  intro: string;
  benefits: readonly string[];
  destination: string;
  action: string;
  image?: StudyToolImage;
  gallery?: { heading: string; intro: string; items: readonly StudyToolImage[] };
};

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
    image: { src: '/marketing/notes-to-test.png', alt: 'A student’s notes turning into flashcards and then a generated test in ilm AI' },
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
    image: { src: '/marketing/smart-learning.png', alt: 'A student asking the ilm AI Tutor a question and receiving a step-by-step explanation and a visual diagram' },
    gallery: {
      heading: 'A few sample walkthroughs',
      intro: 'Every explanation shows the working, not just the final answer — here is the same idea applied to five different quadratic equations.',
      items: [
        { src: '/marketing/walkthrough-first-error.png', alt: 'Worked solution for 2x^2 - 7x + 3 = 0 with the exact step where a mark was lost highlighted' },
        { src: '/marketing/walkthrough-well-done.png', alt: 'Worked solution for x^2 - 4x - 12 = 0 solved step by step to the final answer' },
        { src: '/marketing/walkthrough-well-solved.png', alt: 'Worked solution for x^2 + 6x + 8 = 0 solved step by step to the final answer' },
        { src: '/marketing/walkthrough-great-job.png', alt: 'Worked solution for x^2 - 9 = 0 using the difference of squares' },
        { src: '/marketing/walkthrough-two-solutions.png', alt: 'Worked solution for 3x^2 + 5x - 2 = 0 using the quadratic formula' },
      ],
    },
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
  scan: {
    name: 'Scan & Solve',
    shortName: 'Scan & Solve',
    description:
      'Photograph a handwritten page, textbook problem, or diagram and get it read, explained, and turned into practice with ilm AI.',
    heading: 'Point a camera at your work and get a real explanation',
    intro:
      'Upload a photo of handwritten working, a textbook page, a diagram, or a tricky numerical. ilm AI reads the page, explains the concept in English or Roman Urdu, and can turn everything you have scanned into a fresh test.',
    benefits: [
      'Reads handwritten pages, textbooks, and diagrams from a photo',
      'Step-by-step explanation, not just a final answer',
      'Turns scanned pages into a practice test in one step',
    ],
    destination: '/scan',
    action: 'Scan a Page',
    image: { src: '/marketing/smart-testing.png', alt: 'A photo being scanned, read by ilm AI, and turned into a multiple-choice test in seconds' },
  },
  doubts: {
    name: 'Ask a Teacher',
    shortName: 'Ask a Teacher',
    description:
      'Post a specific academic question with a photo of your working and get a reply from a real teacher, a classmate, or the ilm AI Tutor.',
    heading: 'Stuck on one question? Ask, with your working scanned straight in',
    intro:
      'The doubt board lets you post a specific question and scan a photo of your own working directly into it, then get help from a teacher, a classmate, or the ilm AI Tutor. Every reply stays attached to the question so you can see the reasoning, not just the final result.',
    benefits: [
      'Scan a photo of your working straight into the question',
      'Answered by a teacher, a classmate, or the AI Tutor',
      'Public board so you can learn from questions other students asked',
    ],
    destination: '/doubts',
    action: 'Ask a Question',
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
  { name: 'Scan & Solve', url: '/features/scan' },
  { name: 'Ask a Teacher', url: '/features/doubts' },
  { name: 'Presentation Builder', url: '/features/presentation-builder' },
] as const;
