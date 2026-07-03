// ============================================
// STUDYVERSE AI - GLOBAL TYPES
// ============================================

export type Board = 'FBISE' | 'BISE_LHR' | 'BISE_KHI' | 'BISE_RWP' | 'BISE_FSD' | 'AKU' | 'OTHER';
export type GradeLevel = 'GRADE_9' | 'GRADE_10' | 'GRADE_11' | 'GRADE_12' | 'O_LEVEL' | 'A_LEVEL';
export type SubscriptionTier = 'FREE' | 'PRO' | 'ELITE';
export type QuestionType = 'MCQ' | 'SHORT' | 'LONG' | 'FILL_BLANK' | 'TRUE_FALSE';
export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';
export type SessionStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
export type AiProvider = 'groq' | 'anthropic' | 'openai';
export type ConversationRole = 'user' | 'assistant' | 'system';

export type AiProviderId = 'groq' | 'claude' | 'gpt' | 'gemini';
export type UserRole = 'student' | 'parent' | 'teacher' | 'admin';

// User & Profile
export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  board?: Board;
  gradeLevel?: GradeLevel;
  subjects?: string[];
  phone?: string;
  bio?: string;
  location?: string;
  subscriptionTier: SubscriptionTier;
  subscriptionExpiresAt?: string;
  xp: number;
  level: number;
  streak: number;
  totalStudyTime: number;
  isEmailVerified: boolean;
  isProfileComplete: boolean;
  onboardingStep: number;
  role: UserRole;
  isAiOperated: boolean;
  aiPersonaProvider?: AiProviderId;
  createdAt: string;
  updatedAt: string;
}

// Subject & Content
export interface Subject {
  id: string;
  name: string;
  slug: string;
  code: string;
  description?: string;
  iconUrl?: string;
  color: string;
  boards: Board[];
  gradeLevels: GradeLevel[];
  isActive: boolean;
  totalChapters: number;
  totalQuestions: number;
  createdAt: string;
}

export interface Chapter {
  id: string;
  subjectId: string;
  name: string;
  slug: string;
  description?: string;
  orderIndex: number;
  isActive: boolean;
  totalTopics: number;
  totalQuestions: number;
  subject?: Subject;
}

export interface Topic {
  id: string;
  chapterId: string;
  name: string;
  slug: string;
  content?: string;
  videoUrl?: string;
  orderIndex: number;
  isActive: boolean;
  chapter?: Chapter;
}

// Questions
export interface Question {
  id: string;
  topicId?: string;
  chapterId: string;
  subjectId: string;
  type: QuestionType;
  difficulty: Difficulty;
  text: string;
  options?: QuestionOption[];
  correctAnswer: string | string[];
  explanation?: string;
  marks: number;
  year?: number;
  board?: Board;
  tags?: string[];
  isVerified: boolean;
  timesAttempted: number;
  correctRate: number;
  createdAt: string;
}

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect?: boolean;
}

// Quiz Session
export interface QuizSession {
  id: string;
  userId: string;
  subjectId: string;
  chapterIds?: string[];
  questions: QuizQuestion[];
  currentIndex: number;
  answers: Record<string, string | string[]>;
  startedAt: string;
  completedAt?: string;
  timeLimit?: number;
  timeSpent: number;
  status: SessionStatus;
  score?: number;
  totalMarks: number;
  correctCount: number;
  incorrectCount: number;
  skippedCount: number;
  mode: 'PRACTICE' | 'TEST' | 'REVIEW' | 'EXAM';
}

export interface QuizQuestion extends Question {
  userAnswer?: string | string[];
  isCorrect?: boolean;
  timeSpent?: number;
}

// AI Chat
export interface ChatMessage {
  id: string;
  role: ConversationRole;
  content: string;
  timestamp: string;
  isStreaming?: boolean;
  metadata?: {
    subject?: string;
    chapter?: string;
    sources?: string[];
    tokensUsed?: number;
  };
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  subjectId?: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
  totalMessages: number;
  provider: AiProvider;
}

// Flashcards
export interface Flashcard {
  id: string;
  userId: string;
  deckId: string;
  front: string;
  back: string;
  hint?: string;
  tags?: string[];
  difficulty: Difficulty;
  nextReviewAt: string;
  interval: number;
  easeFactor: number;
  repetitions: number;
  isStarred: boolean;
}

export interface FlashcardDeck {
  id: string;
  userId: string;
  name: string;
  description?: string;
  subjectId?: string;
  chapterId?: string;
  coverColor: string;
  isPublic: boolean;
  totalCards: number;
  dueCards: number;
  createdAt: string;
  updatedAt: string;
}

// Progress & Analytics
export interface StudySession {
  id: string;
  userId: string;
  subjectId: string;
  type: 'READING' | 'QUIZ' | 'FLASHCARD' | 'AI_CHAT' | 'PAST_PAPER';
  duration: number;
  xpEarned: number;
  date: string;
}

export interface SubjectProgress {
  subjectId: string;
  subjectName: string;
  totalTopics: number;
  completedTopics: number;
  averageScore: number;
  totalQuestions: number;
  correctAnswers: number;
  studyTime: number;
  lastStudied?: string;
  progressPercent: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  xpReward: number;
  condition: string;
  earnedAt?: string;
  isEarned: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  fullName: string;
  avatarUrl?: string;
  board?: Board;
  xp: number;
  level: number;
  streak: number;
  badge?: string;
}

// Subscription
export interface SubscriptionPlan {
  id: string;
  name: string;
  tier: SubscriptionTier;
  priceMonthly: number;
  priceAnnual: number;
  features: string[];
  limits: {
    aiMessagesPerDay: number;
    quizzesPerDay: number;
    flashcardsTotal: number;
    pastPapersAccess: boolean;
    downloadPDF: boolean;
    prioritySupport: boolean;
  };
  isPopular?: boolean;
}

// Notifications
export interface Notification {
  id: string;
  userId: string;
  type: 'ACHIEVEMENT' | 'STREAK' | 'REMINDER' | 'SYSTEM' | 'SOCIAL';
  title: string;
  message: string;
  iconUrl?: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

// Past Papers
export interface PastPaper {
  id: string;
  subjectId: string;
  board: Board;
  year: number;
  paperType: 'ANNUAL' | 'SUPPLEMENTARY' | 'MODEL';
  fileUrl: string;
  thumbnailUrl?: string;
  totalQuestions: number;
  duration: number;
  isVerified: boolean;
  downloadCount: number;
}

// Notes
export interface Note {
  id: string;
  userId: string;
  title: string;
  content: string;
  subjectId?: string;
  chapterId?: string;
  tags?: string[];
  isStarred: boolean;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

// API Response Types
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
  status: 'success' | 'error';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

// Admin Types
export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  proUsers: number;
  totalQuestions: number;
  totalSessions: number;
  aiMessagesToday: number;
  revenue: number;
  growthRate: number;
}

// Doubt Board ("Ask a Teacher" — replies may come from a human or an AI-operated
// Teacher account; the UI never reveals which)
export interface Doubt {
  id: string;
  studentId: string;
  subjectId?: string;
  title: string;
  body: string;
  imageUrl?: string;
  isResolved: boolean;
  createdAt: string;
  studentName?: string;
  replies?: DoubtReply[];
}

export interface DoubtReply {
  id: string;
  doubtId: string;
  teacherId: string;
  teacherName?: string;
  teacherAvatarUrl?: string;
  body: string;
  isAccepted: boolean;
  createdAt: string;
}

// Lectures (YouTube embeds per chapter/topic, including math exercise walkthroughs)
export interface Lecture {
  id: string;
  chapterId: string;
  topicId?: string;
  title: string;
  youtubeUrl: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  kind: 'lecture' | 'exercise_walkthrough';
  exerciseNumber?: string;
  orderIndex: number;
}

// Library (Google Drive book/notes links)
export interface LibraryResource {
  id: string;
  title: string;
  description?: string;
  category: 'local' | 'international';
  subjectId?: string;
  board?: Board;
  gradeLevel?: GradeLevel;
  driveUrl: string;
  driveFileId?: string;
  thumbnailUrl?: string;
  fileType: 'pdf' | 'docx' | 'pptx' | 'other';
  createdAt: string;
}

// Study Routine (AI-generated personalized weekly schedule)
export interface StudyRoutinePreferences {
  availableDays: string[];
  hoursPerDay: number;
  preferredTimeOfDay: 'morning' | 'afternoon' | 'evening' | 'night' | 'flexible';
  subjects: string[];
  examDate?: string;
  weakSubjects?: string[];
  goals?: string;
}

export interface StudyRoutineSlot {
  day: string;
  startTime: string;
  endTime: string;
  subject: string;
  activity: string;
}

export interface StudyRoutine {
  id: string;
  userId: string;
  preferences: StudyRoutinePreferences;
  schedule: StudyRoutineSlot[];
  generatedByProvider: AiProviderId;
  createdAt: string;
  updatedAt: string;
}
