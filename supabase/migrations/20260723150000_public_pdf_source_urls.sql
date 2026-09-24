-- Public study files should open directly in the browser. Only file URLs are
-- exposed; companion AI context files and private user data remain protected.
grant select (
  drive_url, light_file_url, dark_file_url, thumbnail_url
) on table public.library_resources to anon;

grant select (file_url, thumbnail_url) on table public.past_papers to anon;
