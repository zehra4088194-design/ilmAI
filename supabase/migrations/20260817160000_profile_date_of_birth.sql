-- Adds a general-purpose date_of_birth to profiles (previously only existed on
-- school_enrollments/college_enrollments, set by admin at enrollment time — not
-- usable for individual/non-institutional accounts, or before a student is
-- enrolled). Primary use: the under-8 Kids Dashboard eligibility check
-- (src/lib/kids/eligibility.ts), which needs to work for every account type, not
-- just school-enrolled students.
alter table public.profiles
  add column if not exists date_of_birth date;
