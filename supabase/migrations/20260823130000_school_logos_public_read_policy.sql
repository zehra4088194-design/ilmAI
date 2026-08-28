-- school-logos was missing a public SELECT policy that college-logos already has. Without it,
-- Postgres' INSERT ... ON CONFLICT (upsert) can't resolve row visibility for the conflict check,
-- which Postgres reports as a generic "new row violates row-level security policy" error even
-- though the INSERT/UPDATE policies themselves are correct — this is what made every school logo
-- upload fail (college logo uploads already worked, since college-logos had this policy).
-- Applied live via mcp__supabase__apply_migration; this file mirrors that change for the repo.
create policy "public read school logos"
on storage.objects
for select
to public
using (bucket_id = 'school-logos');
