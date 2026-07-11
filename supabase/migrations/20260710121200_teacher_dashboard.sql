create table if not exists public.teacher_classes (
  id uuid primary key default uuid_generate_v4(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  subject_id uuid references public.subjects(id),
  grade_level grade_level,
  board text,
  join_code text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists public.class_enrollments (
  id uuid primary key default uuid_generate_v4(),
  class_id uuid not null references public.teacher_classes(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  unique(class_id, student_id)
);

create table if not exists public.class_assignments (
  id uuid primary key default uuid_generate_v4(),
  class_id uuid not null references public.teacher_classes(id) on delete cascade,
  title text not null,
  description text,
  due_date timestamptz,
  max_marks integer,
  attachment_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.assignment_submissions (
  id uuid primary key default uuid_generate_v4(),
  assignment_id uuid not null references public.class_assignments(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  submission_url text,
  submission_text text,
  submitted_at timestamptz not null default now(),
  marks_awarded numeric,
  feedback text,
  ai_feedback text,
  graded_at timestamptz,
  unique(assignment_id, student_id)
);

create table if not exists public.class_attendance (
  id uuid primary key default uuid_generate_v4(),
  class_id uuid not null references public.teacher_classes(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  session_date date not null,
  status text not null check (status in ('present','absent','late','excused')),
  marked_by uuid references public.profiles(id),
  unique(class_id, student_id, session_date)
);

create table if not exists public.class_lectures (
  id uuid primary key default uuid_generate_v4(),
  class_id uuid not null references public.teacher_classes(id) on delete cascade,
  title text not null,
  video_url text,
  resource_url text,
  chapter_id uuid references public.chapters(id),
  created_at timestamptz not null default now()
);

alter table public.quiz_sessions add column if not exists class_id uuid references public.teacher_classes(id);

alter table public.teacher_classes enable row level security;
alter table public.class_enrollments enable row level security;
alter table public.class_assignments enable row level security;
alter table public.assignment_submissions enable row level security;
alter table public.class_attendance enable row level security;
alter table public.class_lectures enable row level security;

drop policy if exists "teacher manages own classes" on public.teacher_classes;
create policy "teacher manages own classes" on public.teacher_classes
  for all using (auth.uid() = teacher_id) with check (auth.uid() = teacher_id);

drop policy if exists "enrolled student reads class" on public.teacher_classes;
create policy "enrolled student reads class" on public.teacher_classes
  for select using (
    exists (select 1 from public.class_enrollments e where e.class_id = teacher_classes.id and e.student_id = auth.uid())
    or auth.uid() = teacher_id
  );

drop policy if exists "student reads own enrollment" on public.class_enrollments;
create policy "student reads own enrollment" on public.class_enrollments
  for select using (auth.uid() = student_id or exists (
    select 1 from public.teacher_classes c where c.id = class_enrollments.class_id and c.teacher_id = auth.uid()
  ));

drop policy if exists "server inserts enrollments" on public.class_enrollments;
create policy "server inserts enrollments" on public.class_enrollments for insert with check (false);

drop policy if exists "class members read assignments" on public.class_assignments;
create policy "class members read assignments" on public.class_assignments
  for select using (
    exists (select 1 from public.class_enrollments e where e.class_id = class_assignments.class_id and e.student_id = auth.uid())
    or exists (select 1 from public.teacher_classes c where c.id = class_assignments.class_id and c.teacher_id = auth.uid())
  );

drop policy if exists "teacher manages assignments" on public.class_assignments;
create policy "teacher manages assignments" on public.class_assignments
  for insert with check (exists (select 1 from public.teacher_classes c where c.id = class_assignments.class_id and c.teacher_id = auth.uid()));

drop policy if exists "teacher updates assignments" on public.class_assignments;
create policy "teacher updates assignments" on public.class_assignments
  for update using (exists (select 1 from public.teacher_classes c where c.id = class_assignments.class_id and c.teacher_id = auth.uid()));

drop policy if exists "student manages own submission" on public.assignment_submissions;
create policy "student manages own submission" on public.assignment_submissions
  for all using (auth.uid() = student_id) with check (auth.uid() = student_id);

drop policy if exists "teacher reads submissions" on public.assignment_submissions;
create policy "teacher reads submissions" on public.assignment_submissions
  for select using (exists (
    select 1 from public.class_assignments a join public.teacher_classes c on c.id = a.class_id
    where a.id = assignment_submissions.assignment_id and c.teacher_id = auth.uid()
  ));

drop policy if exists "teacher grades submissions" on public.assignment_submissions;
create policy "teacher grades submissions" on public.assignment_submissions
  for update using (exists (
    select 1 from public.class_assignments a join public.teacher_classes c on c.id = a.class_id
    where a.id = assignment_submissions.assignment_id and c.teacher_id = auth.uid()
  ));

drop policy if exists "teacher manages attendance" on public.class_attendance;
create policy "teacher manages attendance" on public.class_attendance
  for all using (exists (select 1 from public.teacher_classes c where c.id = class_attendance.class_id and c.teacher_id = auth.uid()))
  with check (exists (select 1 from public.teacher_classes c where c.id = class_attendance.class_id and c.teacher_id = auth.uid()));

drop policy if exists "student reads own attendance" on public.class_attendance;
create policy "student reads own attendance" on public.class_attendance
  for select using (auth.uid() = student_id);

drop policy if exists "class members read lectures" on public.class_lectures;
create policy "class members read lectures" on public.class_lectures
  for select using (
    exists (select 1 from public.class_enrollments e where e.class_id = class_lectures.class_id and e.student_id = auth.uid())
    or exists (select 1 from public.teacher_classes c where c.id = class_lectures.class_id and c.teacher_id = auth.uid())
  );

drop policy if exists "teacher manages lectures" on public.class_lectures;
create policy "teacher manages lectures" on public.class_lectures
  for all using (exists (select 1 from public.teacher_classes c where c.id = class_lectures.class_id and c.teacher_id = auth.uid()))
  with check (exists (select 1 from public.teacher_classes c where c.id = class_lectures.class_id and c.teacher_id = auth.uid()));
