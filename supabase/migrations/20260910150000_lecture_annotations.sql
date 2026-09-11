-- Lecture annotation system: teachers mark what happened in each lecture (test / lesson reading),
-- optionally attach a photo with hand-drawn highlights, and students see it on "Today's Homework".
--
-- Adds:
--   - school_lecture_annotations: one row per lecture per section (date, type, topic, photo_url,
--     highlight_color, highlighted_text jsonb).
--   - school_homework_annotations: links an annotation to a specific homework item so students see
--     the annotated photo alongside their assignment.
--   - student_today_homework view: aggregates today's homework + annotations for a given student.

-- =========================================
-- SCHOOL
-- =========================================

create table if not exists public.school_lecture_annotations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.school_organizations(id) on delete cascade,
  section_id uuid not null references public.school_sections(id) on delete cascade,
  subject_offering_id uuid references public.school_subject_offerings(id) on delete set null,
  -- 'test' | 'lesson_reading' — what the teacher did in this lecture
  activity_type text not null default 'lesson_reading'
    check (activity_type in ('test', 'lesson_reading')),
  -- Topic/chapter reference (e.g. "1.2.3", "Chapter 5", "Quadratic Equations")
  topic text not null,
  -- Photo URL of the whiteboard/paper with hand-drawn highlight
  photo_url text,
  -- Highlight color used in the photo (hex or name)
  highlight_color text,
  -- JSON array of {x, y, w, h, label} bounding boxes for highlighted regions
  highlighted_regions jsonb not null default '[]'::jsonb,
  -- Summary of work done / test questions
  summary text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists school_lecture_annotations_org_date_idx
  on public.school_lecture_annotations (organization_id, created_at desc);
create index if not exists school_lecture_annotations_section_idx
  on public.school_lecture_annotations (section_id, created_at desc);

alter table public.school_lecture_annotations enable row level security;

create policy "school members read lecture annotations"
  on public.school_lecture_annotations for select
  using (public.school_is_member(organization_id));

create policy "teachers insert own lecture annotations"
  on public.school_lecture_annotations for insert
  with check (
    created_by = auth.uid()
    and public.school_has_role(organization_id, array['owner', 'admin', 'teacher'])
  );

create policy "teachers update own lecture annotations"
  on public.school_lecture_annotations for update
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

-- Link annotations to homework items
create table if not exists public.school_homework_annotations (
  id uuid primary key default gen_random_uuid(),
  homework_id uuid not null references public.school_homework(id) on delete cascade,
  annotation_id uuid not null references public.school_lecture_annotations(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (homework_id, annotation_id)
);

alter table public.school_homework_annotations enable row level security;

create policy "school members read homework annotations"
  on public.school_homework_annotations for select
  using (
    exists (
      select 1 from public.school_homework h
      where h.id = school_homework_annotations.homework_id
        and public.school_is_member(h.organization_id)
    )
  );

-- View: today's homework with annotations for a student
create or replace function public.student_today_homework(p_student_id uuid)
returns table (
  homework_id uuid,
  title text,
  instructions text,
  due_at timestamptz,
  section_name text,
  class_name text,
  subject_name text,
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
    h.id,
    h.title,
    h.instructions,
    h.due_at,
    s.name,
    sc.name,
    so.subject_name,
    la.activity_type,
    la.topic,
    la.photo_url,
    la.highlight_color,
    la.highlighted_regions,
    la.summary
  from public.school_homework h
  join public.school_sections s on s.id = h.section_id
  join public.school_classes sc on sc.id = s.class_id
  left join public.school_subject_offerings so on so.id = h.subject_offering_id
  left join public.school_enrollments e on e.section_id = h.section_id and e.student_id = p_student_id and e.status = 'active'
  left join public.school_homework_annotations ha on ha.homework_id = h.id
  left join public.school_lecture_annotations la on la.id = ha.annotation_id
  where h.assigned_on = current_date
    and e.id is not null
  order by h.due_at asc;
$$;

revoke all on function public.student_today_homework(uuid) from public;
grant execute on function public.student_today_homework(uuid) to authenticated;

-- =========================================
-- COLLEGE (mirror)
-- =========================================

create table if not exists public.college_lecture_annotations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.college_organizations(id) on delete cascade,
  section_id uuid not null references public.college_sections(id) on delete cascade,
  activity_type text not null default 'lesson_reading'
    check (activity_type in ('test', 'lesson_reading')),
  topic text not null,
  photo_url text,
  highlight_color text,
  highlighted_regions jsonb not null default '[]'::jsonb,
  summary text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists college_lecture_annotations_org_date_idx
  on public.college_lecture_annotations (organization_id, created_at desc);
create index if not exists college_lecture_annotations_section_idx
  on public.college_lecture_annotations (section_id, created_at desc);

alter table public.college_lecture_annotations enable row level security;

create policy "college members read lecture annotations"
  on public.college_lecture_annotations for select
  using (public.college_is_member(organization_id));

create policy "college teachers insert own lecture annotations"
  on public.college_lecture_annotations for insert
  with check (
    created_by = auth.uid()
    and public.college_has_role(organization_id, array['owner', 'admin', 'teacher'])
  );

create policy "college teachers update own lecture annotations"
  on public.college_lecture_annotations for update
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create table if not exists public.college_assignments_annotations (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.college_assignments(id) on delete cascade,
  annotation_id uuid not null references public.college_lecture_annotations(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (assignment_id, annotation_id)
);

alter table public.college_assignments_annotations enable row level security;

create policy "college members read assignment annotations"
  on public.college_assignments_annotations for select
  using (
    exists (
      select 1 from public.college_assignments a
      where a.id = college_assignments_annotations.assignment_id
        and public.college_is_member(a.organization_id)
    )
  );
