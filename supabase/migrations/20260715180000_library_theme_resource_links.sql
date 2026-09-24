alter table public.library_resources
  add column if not exists light_file_url text,
  add column if not exists dark_file_url text;

update public.library_resources
set light_file_url = coalesce(light_file_url, drive_url)
where light_file_url is null and drive_url is not null;
