-- Phase 6e completion: school_admissions/college_admissions only ever captured the GUARDIAN's
-- email, never the applicant/student's own — so there was no reliable way to auto-link an
-- admission to the eventual student's ilm AI account when marking it 'enrolled'. Adds an optional
-- applicant_email so the enrollment auto-link (updateAdmissionStatus) has something to match a
-- profile against when the student already registered their own account.
alter table public.school_admissions add column if not exists applicant_email text;
alter table public.college_admissions add column if not exists applicant_email text;
