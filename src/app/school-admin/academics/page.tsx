import { redirect } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SchoolActionForm } from '@/components/features/school-erp/SchoolActionForm';
import { SchoolPageHeader } from '@/components/features/school-erp/SchoolPageHeader';
import { createCalendarEvent, createHomework, createLessonPlan, createTimetableEntry } from '@/lib/school-erp/actions';
import { hasSchoolPermission, requireSchoolContext } from '@/lib/school-erp/access';
import { getSchoolAcademics } from '@/lib/school-erp/queries';

const selectClass = 'border-input bg-background h-10 w-full rounded-lg border px-3 text-sm';
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default async function SchoolAcademicsPage() {
  const { supabase, context } = await requireSchoolContext('academics.read', 'academics');
  if (!context) redirect('/school-admin');
  const data = await getSchoolAcademics(supabase, context);
  const canManage = hasSchoolPermission(context, 'academics.manage');

  return (
    <div className="space-y-6">
      <SchoolPageHeader title="Academics" description="Homework, timetable, lesson planning, subjects, and academic calendar." />
      {canManage && (
        <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Assign homework</CardTitle></CardHeader>
            <CardContent>
              <SchoolActionForm action={createHomework} submitLabel="Assign homework">
                <select name="section_id" className={selectClass} required><option value="">Section</option>{data.sections.map((item: any) => <option key={item.id} value={item.id}>{item.school_classes?.name} - {item.name}</option>)}</select>
                <select name="subject_offering_id" className={selectClass}><option value="">Subject</option>{data.offerings.map((item: any) => <option key={item.id} value={item.id}>{item.subject_name}</option>)}</select>
                <Input name="title" placeholder="Homework title" required />
                <Textarea name="instructions" placeholder="Instructions" />
                <Input name="due_at" type="datetime-local" />
                <Input name="attachment_url" placeholder="Attachment URL" />
              </SchoolActionForm>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Timetable entry</CardTitle></CardHeader>
            <CardContent>
              <SchoolActionForm action={createTimetableEntry} submitLabel="Add period">
                <select name="section_id" className={selectClass} required><option value="">Section</option>{data.sections.map((item: any) => <option key={item.id} value={item.id}>{item.school_classes?.name} - {item.name}</option>)}</select>
                <Input name="subject_name" placeholder="Subject" required />
                <select name="day_of_week" className={selectClass}>{DAYS.map((day, index) => <option key={day} value={index + 1}>{day}</option>)}</select>
                <div className="grid grid-cols-2 gap-3"><Input name="starts_at" type="time" required /><Input name="ends_at" type="time" required /></div>
                <Input name="room" placeholder="Room" />
              </SchoolActionForm>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Lesson plan</CardTitle></CardHeader>
            <CardContent>
              <SchoolActionForm action={createLessonPlan} submitLabel="Add lesson plan">
                <select name="subject_offering_id" className={selectClass} required><option value="">Subject</option>{data.offerings.map((item: any) => <option key={item.id} value={item.id}>{item.subject_name}</option>)}</select>
                <Input name="title" placeholder="Lesson title" required />
                <Input name="lesson_date" type="date" required />
                <Input name="objectives" placeholder="Learning objectives" />
                <Textarea name="content" placeholder="Lesson content" />
                <Input name="resources" placeholder="Resources, comma separated" />
                <select name="status" className={selectClass}><option value="draft">Draft</option><option value="ready">Ready</option><option value="delivered">Delivered</option><option value="reviewed">Reviewed</option></select>
              </SchoolActionForm>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Calendar event</CardTitle></CardHeader>
            <CardContent>
              <SchoolActionForm action={createCalendarEvent} submitLabel="Add event">
                <Input name="title" placeholder="Event title" required />
                <select name="event_type" className={selectClass}><option value="academic">Academic</option><option value="exam">Exam</option><option value="holiday">Holiday</option><option value="meeting">Meeting</option><option value="activity">Activity</option><option value="deadline">Deadline</option></select>
                <Input name="starts_at" type="datetime-local" required />
                <Input name="ends_at" type="datetime-local" />
                <Textarea name="description" placeholder="Description" />
              </SchoolActionForm>
            </CardContent>
          </Card>
        </div>
      )}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-base">Recent homework</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.homework.map((item: any) => <div key={item.id} className="border-border rounded-lg border p-3"><div className="flex items-center justify-between gap-2"><p className="truncate text-sm font-semibold">{item.title}</p><Badge variant="outline">{item.school_sections?.name || 'Section'}</Badge></div><p className="text-muted-foreground mt-1 line-clamp-2 text-xs">{item.instructions || 'No instructions'}</p><p className="text-muted-foreground mt-2 text-[11px]">{item.due_at ? `Due ${new Date(item.due_at).toLocaleString()}` : 'No due date'}</p></div>)}
            {!data.homework.length && <p className="text-muted-foreground text-sm">No homework assigned.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Lesson plans</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.lessonPlans.map((item: any) => <div key={item.id} className="border-border rounded-lg border p-3"><div className="flex items-center justify-between gap-2"><p className="truncate text-sm font-semibold">{item.title}</p><Badge variant="outline">{item.status}</Badge></div><p className="text-muted-foreground mt-1 text-xs">{item.school_subject_offerings?.subject_name || 'Subject'} - {item.lesson_date}</p></div>)}
            {!data.lessonPlans.length && <p className="text-muted-foreground text-sm">No lesson plans.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Weekly timetable</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {DAYS.map((day, index) => {
              const entries = data.timetable.filter((item: any) => item.day_of_week === index + 1);
              if (!entries.length) return null;
              return <div key={day}><p className="text-muted-foreground mb-1 text-xs font-semibold">{day}</p><div className="space-y-1">{entries.map((item: any) => <div key={item.id} className="bg-muted/40 flex items-center gap-3 rounded-md px-3 py-2 text-xs"><span className="w-24 font-mono">{String(item.starts_at).slice(0, 5)}-{String(item.ends_at).slice(0, 5)}</span><span className="min-w-0 flex-1 truncate font-medium">{item.subject_name}</span><span className="text-muted-foreground">{item.school_sections?.name}</span></div>)}</div></div>;
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
