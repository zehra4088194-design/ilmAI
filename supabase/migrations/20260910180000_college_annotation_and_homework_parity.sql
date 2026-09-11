-- Complete the college mirror for chapter-linked lecture annotations and today's homework.

alter table public.college_lecture_annotations
  add column if not exists chapter_id uuid references public.chapters(id) on delete set null;

create index if not exists college_lecture_annotations_chapter_idx
  on public.college_lecture_annotations (chapter_id);

create or replace function public.college_student_today_homework(p_student_id uuid)
returns table (
  homework_id uuid,
  title text,
  instructions text,
  due_at timestamptz,
  section_name text,
  semester_name text,
  course_name text,
  activity_type text,
  topic text,
  photo_url text,
  highlight_color text,
  highlighted_regions jsonb,
  summary text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    a.id,
    a.title,
    a.instructions,
    a.due_at,
    s.name,
    semester.name,
    co.course_name,
    la.activity_type,
    la.topic,
    la.photo_url,
    la.highlight_color,
    la.highlighted_regions,
    la.summary
  from public.college_assignments a
  join public.college_sections s on s.id = a.section_id
  join public.college_semesters semester on semester.id = s.semester_id
  left join public.college_course_offerings co on co.id = a.course_offering_id
  join public.college_enrollments e
    on e.section_id = a.section_id
   and e.student_id = p_student_id
   and e.status = 'active'
  left join public.college_assignments_annotations aa on aa.assignment_id = a.id
  left join public.college_lecture_annotations la on la.id = aa.annotation_id
  where a.assigned_on = current_date
    and auth.uid() = p_student_id
    and exists (
      select 1
      from public.college_memberships m
      where m.organization_id = a.organization_id
        and m.profile_id = auth.uid()
        and m.member_role = 'student'
        and m.status = 'active'
    )
  order by a.due_at asc nulls last;
$$;

revoke all on function public.college_student_today_homework(uuid) from public;
grant execute on function public.college_student_today_homework(uuid) to authenticated;
