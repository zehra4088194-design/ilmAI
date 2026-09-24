-- College-side mirror of the school admission-funnel migration (20260829105000) — same widened
-- status vocabulary, so the college admissions team gets the same inquiry -> visit -> entry test
-- -> admitted pipeline the school portal already has.
alter table public.college_admissions drop constraint if exists college_admissions_status_check;
alter table public.college_admissions add constraint college_admissions_status_check
  check (status = any (array[
    'inquiry', 'visit_scheduled', 'entry_test_scheduled',
    'draft', 'submitted', 'under_review', 'waitlisted', 'approved', 'rejected', 'enrolled', 'withdrawn'
  ]));
