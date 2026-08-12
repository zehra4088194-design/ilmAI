import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ExamMarksRegister } from '@/components/features/school-erp/ExamMarksRegister';
import { DateSheetWizard } from '@/components/features/school-erp/DateSheetWizard';
import { SchoolActionForm } from '@/components/features/school-erp/SchoolActionForm';
import { SchoolPageHeader } from '@/components/features/school-erp/SchoolPageHeader';
import { createExam, createExamSchedule, publishExamResults } from '@/lib/school-erp/actions';
import { generateReportCardRemarks } from '@/lib/school-erp/ai-insights';
import { hasSchoolPermission, requireSchoolContext } from '@/lib/school-erp/access';
import { getSchoolExams } from '@/lib/school-erp/queries';

const selectClass = 'border-input bg-background h-10 w-full rounded-lg border px-3 text-sm';

export default async function SchoolExamsPage() {
  const { supabase, context } = await requireSchoolContext('exams.read', 'exams');
  if (!context) redirect('/school-admin');
  const data = await getSchoolExams(supabase, context);
  const canManage = hasSchoolPermission(context, 'exams.manage');

  return (
    <div className="space-y-6">
      <SchoolPageHeader
        title="Exams & results"
        description="Exam setup, date sheets, marks entry, GPA, positions, and published report cards."
      />
      {canManage && (
        <div className="grid gap-5 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Create exam</CardTitle>
            </CardHeader>
            <CardContent>
              <SchoolActionForm action={createExam} submitLabel="Create exam">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input name="name" placeholder="Mid Term" required />
                  <Input name="term" placeholder="Term 1" />
                </div>
                <select name="academic_year_id" className={selectClass} required>
                  <option value="">Academic year</option>
                  {data.years.map((item: any) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
                <div className="grid grid-cols-2 gap-3">
                  <Input name="starts_on" type="date" required />
                  <Input name="ends_on" type="date" required />
                </div>
              </SchoolActionForm>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick add (single subject)</CardTitle>
            </CardHeader>
            <CardContent>
              <SchoolActionForm action={createExamSchedule} submitLabel="Add subject">
                <div className="grid gap-3 sm:grid-cols-2">
                  <select name="exam_id" className={selectClass} required>
                    <option value="">Exam</option>
                    {data.exams.map((item: any) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                  <select name="section_id" className={selectClass} required>
                    <option value="">Section</option>
                    {data.sections.map((item: any) => (
                      <option key={item.id} value={item.id}>
                        {item.school_classes?.name} - {item.name}
                      </option>
                    ))}
                  </select>
                </div>
                <Input name="subject_name" placeholder="Subject" required />
                <div className="grid gap-3 sm:grid-cols-3">
                  <Input name="exam_date" type="date" required />
                  <Input name="starts_at" type="time" />
                  <Input name="room" placeholder="Room" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input name="max_marks" type="number" defaultValue={100} />
                  <Input name="passing_marks" type="number" defaultValue={40} />
                </div>
              </SchoolActionForm>
            </CardContent>
          </Card>
        </div>
      )}
      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Guided date-sheet builder</CardTitle>
          </CardHeader>
          <CardContent>
            <DateSheetWizard exams={data.exams} sections={data.sections} />
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Marks register</CardTitle>
        </CardHeader>
        <CardContent>
          <ExamMarksRegister
            schedules={data.schedules}
            enrollments={data.enrollments}
            marks={data.marks}
            canManage={canManage}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Result publication</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.exams.map((exam: any) => (
            <div
              key={exam.id}
              className="border-border flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">{exam.name}</p>
                  <Badge variant={exam.status === 'published' ? 'secondary' : 'outline'}>{exam.status}</Badge>
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                  {exam.starts_on} to {exam.ends_on}
                </p>
              </div>
              {canManage && (
                <div className="flex flex-wrap items-start gap-2">
                  <SchoolActionForm
                    action={publishExamResults}
                    submitLabel={exam.status === 'published' ? 'Rebuild report cards' : 'Publish results'}
                    className=""
                  >
                    <input type="hidden" name="exam_id" value={exam.id} />
                  </SchoolActionForm>
                  {exam.status === 'published' && (
                    <>
                      <SchoolActionForm action={generateReportCardRemarks} submitLabel="AI remarks" className="">
                        <input type="hidden" name="exam_id" value={exam.id} />
                      </SchoolActionForm>
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/school-admin/exams/report-cards/${exam.id}`}>Report cards</Link>
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
