create table if not exists public.student_predictions (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  predicted_board_marks numeric,
  predicted_entry_test_score numeric,
  admission_probability jsonb,
  dropout_risk_score numeric check (dropout_risk_score between 0 and 100),
  burnout_risk_score numeric check (burnout_risk_score between 0 and 100),
  weak_chapter_risk jsonb,
  chapter_mastery_estimate jsonb,
  narrative jsonb not null default '{}',
  computed_at timestamptz not null default now()
);

alter table public.student_predictions enable row level security;

drop policy if exists "student reads own predictions" on public.student_predictions;
create policy "student reads own predictions" on public.student_predictions
  for select using (auth.uid() = student_id);

create index if not exists idx_student_predictions_student_computed
  on public.student_predictions(student_id, computed_at desc);
