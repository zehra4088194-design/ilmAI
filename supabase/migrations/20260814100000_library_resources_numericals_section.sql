-- Physics (and possibly other STEM subjects) needs a distinct "Numericals"
-- content section, separate from 'reading' (which was previously used as a
-- catch-all for both textbook-exercise Q&A and numerical-problem sets — the
-- two are pedagogically different and the app now shows them as separate
-- cards on the chapter page).

alter table public.library_resources
  drop constraint library_resources_content_section_check;

alter table public.library_resources
  add constraint library_resources_content_section_check
  check (content_section = any (array['reading'::text, 'mcq'::text, 'short'::text, 'long'::text, 'numericals'::text]));
