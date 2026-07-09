import { BookOpen, ClipboardCheck, FileText, GraduationCap, Mic2, NotebookTabs, Presentation, Route, Search, Sparkles } from 'lucide-react';

export const EDUCATION_LEVELS = [
  { value: 'school', label: 'School', description: 'Class 9-10, board-focused prep' },
  { value: 'college', label: 'College / Intermediate', description: 'Class 11-12, inter and board exams' },
  { value: 'university', label: 'University', description: 'Assignments, semester exams, viva and projects' },
] as const;

export const OUTPUT_STYLES = [
  { value: 'simple', label: 'Simple' },
  { value: 'academic', label: 'Academic' },
  { value: 'professional', label: 'Professional' },
  { value: 'detailed', label: 'Detailed' },
] as const;

export type EducationLevel = (typeof EDUCATION_LEVELS)[number]['value'];
export type PreferredOutputStyle = (typeof OUTPUT_STYLES)[number]['value'];

export const UNIVERSITY_TOOLS = [
  { href: '/university/essay-assistant', label: 'Essay Assistant', description: 'Essays and assignment drafts with headings, examples and conclusion.', icon: FileText },
  { href: '/university/presentation-builder', label: 'Presentation Builder', description: 'Slide-by-slide content, speaker notes and viva questions.', icon: Presentation },
  { href: '/university/viva-practice', label: 'Viva Practice', description: 'Basic to difficult viva questions with model answers.', icon: Mic2 },
  { href: '/university/assignment-helper', label: 'Assignment Helper', description: 'Structured assignment help without fake citations.', icon: ClipboardCheck },
  { href: '/university/research-helper', label: 'Research Helper', description: 'Project titles, abstract, methodology and references placeholders.', icon: Search },
  { href: '/university/semester-planner', label: 'Semester Planner', description: 'Subject-wise study plan for exams and submissions.', icon: Route },
] as const;

export const UNIVERSITY_FEATURES = [
  { label: 'Short notes', icon: NotebookTabs },
  { label: 'Long-form answers', icon: BookOpen },
  { label: 'Conceptual questions', icon: Sparkles },
  { label: 'University Mode', icon: GraduationCap },
] as const;
