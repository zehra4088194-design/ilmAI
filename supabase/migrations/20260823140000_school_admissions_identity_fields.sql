-- Adds the student's B-Form number (Pakistani minors' NADRA ID before they get a real CNIC),
-- the guardian's CNIC number, and an optional student photo URL to school_admissions — requested
-- so a school can capture real identity info at admission time, alongside the guardian phone
-- (already used by the absence-alert Call/WhatsApp widget) already on this table.
alter table public.school_admissions
  add column if not exists b_form_number text,
  add column if not exists guardian_cnic text,
  add column if not exists student_photo_url text;

-- Photo upload bucket for admission-time student photos — mirrors school-logos' pattern (owner/
-- admin only, via admissions.manage-equivalent role check), public read so the photo can be shown
-- across the app (people list, report cards, etc.) without a signed URL.
insert into storage.buckets (id, name, public)
values ('school-student-photos', 'school-student-photos', true)
on conflict (id) do nothing;

create policy "school admins upload student photos"
on storage.objects
for insert
to public
with check (
  bucket_id = 'school-student-photos'
  and school_has_role(((storage.foldername(name))[1])::uuid, array['owner','admin','admissions'])
);

create policy "school admins replace student photos"
on storage.objects
for update
to public
using (
  bucket_id = 'school-student-photos'
  and school_has_role(((storage.foldername(name))[1])::uuid, array['owner','admin','admissions'])
);

create policy "public read student photos"
on storage.objects
for select
to public
using (bucket_id = 'school-student-photos');
