-- MIGRATION 008: University Mode profile fields
-- Enables school, college/intermediate, and university-level personalization.

alter table public.profiles
  add column if not exists education_level text not null default 'school'
  check (education_level in ('school', 'college', 'university'));

alter table public.profiles add column if not exists university_program text;
alter table public.profiles add column if not exists university_semester text;
alter table public.profiles add column if not exists university_courses text[] not null default '{}';
alter table public.profiles add column if not exists university_exam_target_date date;
alter table public.profiles
  add column if not exists preferred_output_style text not null default 'simple'
  check (preferred_output_style in ('simple', 'academic', 'professional', 'detailed'));

comment on column public.profiles.education_level is 'school | college | university. Controls dashboard/tool emphasis.';
comment on column public.profiles.university_program is 'University degree/program name, e.g. BS Computer Science.';
comment on column public.profiles.university_semester is 'University semester/year label entered by student.';
comment on column public.profiles.university_courses is 'Student-entered university courses/subjects.';
comment on column public.profiles.university_exam_target_date is 'Optional semester exam or submission target date.';
comment on column public.profiles.preferred_output_style is 'simple | academic | professional | detailed.';
