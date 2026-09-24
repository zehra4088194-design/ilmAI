alter table public.profiles
  add column if not exists university_stream text,
  add column if not exists university_degree text;

alter table public.college_lectures
  add column if not exists stream text,
  add column if not exists degree_name text,
  add column if not exists chapter_title text;

alter table public.college_resources
  add column if not exists stream text,
  add column if not exists degree_name text,
  add column if not exists chapter_title text,
  add column if not exists light_file_url text,
  add column if not exists dark_file_url text;

update public.college_resources
set light_file_url = coalesce(light_file_url, file_url)
where light_file_url is null and file_url is not null;

create index if not exists college_lectures_scope_idx
  on public.college_lectures (college_id, stream, degree_name, semester, course_name, chapter_title);

create index if not exists college_resources_scope_idx
  on public.college_resources (college_id, stream, degree_name, semester, course_name, chapter_title, resource_type);
