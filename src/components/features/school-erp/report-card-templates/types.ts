export type ReportCardSubject = { subject: string; marks: number | null; maxMarks: number; absent: boolean };

export type ReportCardData = {
  organizationName: string;
  studentName: string;
  examName: string;
  examTerm: string | null;
  publishedAt: string;
  subjects: ReportCardSubject[];
  totalMarks: number;
  obtainedMarks: number;
  percentage: number;
  grade: string | null;
  gpa: number | null;
  classPosition: number | null;
  teacherComment: string | null;
  aiComment: string | null;
};
