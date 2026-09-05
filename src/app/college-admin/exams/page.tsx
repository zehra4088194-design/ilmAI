import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { CollegeExamMarksRegister } from '@/components/features/college-erp/CollegeExamMarksRegister';
import { CollegeDateSheetWizard } from '@/components/features/college-erp/CollegeDateSheetWizard';
import { CollegeActionForm } from '@/components/features/college-erp/CollegeActionForm';
import { createCollegeExam, createCollegeExamSchedule, publishCollegeExamResults } from '@/lib/college-erp/actions';
import { hasCollegePermission, requireCollegeContext } from '@/lib/college-erp/access';
import { getCollegeExams } from '@/lib/college-erp/queries';

const selectClass = 'border-input bg-background h-10 w-full rounded-lg border px-3 text-sm';

export default async function CollegeExamsPage() {
  const { supabase, context } = await requireCollegeContext('exams.read', 'exams');
  if (!context) redirect('/college-admin');
  const data = await getCollegeExams(supabase, context);
  const canManage = hasCollegePermission(context, 'exams.manage');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Exams & results</h1>
        <p className="text-muted-foreground mt-1 text-sm">Exam setup, date sheets, marks entry, GPA, positions, and published report cards.</p>
      </div>
      {canManage && (
        <div className="grid gap-5 xl:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Create exam</CardTitle></CardHeader>
            <CardContent>
              <CollegeActionForm action={createCollegeExam} submitLabel="Create exam">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input name="name" placeholder="Mid Term" required />
                  <Input name="term" placeholder="Semester 1" />
                </div>
                <select name="academic_year_id" className={selectClass} required>
                  <option value="">Academic year</option>
                  {data.years.map((item: any) => (<option key={item.id} value={item.id}>{item.name}</option>))}
                </select>
                <div className="grid grid-cols-2 gap-3">
                  <Input name="starts_on" type="date" required />
                  <Input name="ends_on" type="date" required />
                </div>
              </CollegeActionForm>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Quick add (single course)</CardTitle></CardHeader>
            <CardContent>
              <CollegeActionForm action={createCollegeExamSchedule} submitLabel="Add course">
                <div className="grid gap-3 sm:grid-cols-2">
                  <select name="exam_id" className={selectClass} required>
                    <option value="">Exam</option>
                    {data.exams.map((item: any) => (<option key={item.id} value={item.id}>{item.name}</option>))}
                  </select>
                  <select name="section_id" className={selectClass} required>
                    <option value="">Section</option>
                    {data.sections.map((item: any) => (<option key={item.id} value={item.id}>{item.college_semesters?.name} - {item.name}</option>))}
                  </select>
                </div>
                <Input name="course_name" placeholder="Course" required />
                <div className="grid gap-3 sm:grid-cols-3">
                  <Input name="exam_date" type="date" required />
                  <Input name="starts_at" type="time" />
                  <Input name="room" placeholder="Room" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input name="max_marks" type="number" defaultValue={100} />
                  <Input name="passing_marks" type="number" defaultValue={40} />
                </div>
              </CollegeActionForm>
            </CardContent>
          </Card>
        </div>
      )}
      {canManage && (
        <Card>
          <CardHeader><CardTitle className="text-base">Guided date-sheet builder</CardTitle></CardHeader>
          <CardContent>
            <CollegeDateSheetWizard exams={data.exams} sections={data.sections} />
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader><CardTitle className="text-base">Marks register</CardTitle></CardHeader>
        <CardContent>
          <CollegeExamMarksRegister schedules={data.schedules} enrollments={data.enrollments} marks={data.marks} canManage={canManage} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Result publication</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {data.exams.map((exam: any) => (
            <div key={exam.id} className="border-border flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">{exam.name}</p>
                  <Badge variant={exam.status === 'published' ? 'secondary' : 'outline'}>{exam.status}</Badge>
                </div>
                <p className="text-muted-foreground mt-1 text-xs">{exam.starts_on} to {exam.ends_on}</p>
              </div>
              {canManage && (
                <div className="flex flex-wrap items-start gap-2">
                  <CollegeActionForm action={publishCollegeExamResults} submitLabel={exam.status === 'published' ? 'Rebuild report cards' : 'Publish results'} className="">
                    <input type="hidden" name="exam_id" value={exam.id} />
                  </CollegeActionForm>
                  {exam.status === 'published' && (
                    <>
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/college-admin/exams/report-cards/${exam.id}`}>Report cards</Link>
                      </Button>
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/college-admin/exams/tabulation/${exam.id}`}>Result sheet / merit list</Link>
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
