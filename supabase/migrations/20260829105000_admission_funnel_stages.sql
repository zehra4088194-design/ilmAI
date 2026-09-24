-- Phase 6e: admission funnel / mini-CRM. Extends the existing school_admissions table/status
-- lifecycle with the pre-application stages (inquiry -> visit_scheduled -> entry_test_scheduled)
-- instead of a new parallel pipeline table — school_admissions already has every contact field a
-- CRM lead needs (applicant/guardian name, phone, email, class), and already models
-- submitted -> under_review -> waitlisted -> approved/rejected -> enrolled/withdrawn, which is the
-- back half of the same funnel this phase asks for.
alter table public.school_admissions drop constraint if exists school_admissions_status_check;
alter table public.school_admissions add constraint school_admissions_status_check
  check (status = any (array[
    'inquiry', 'visit_scheduled', 'entry_test_scheduled',
    'draft', 'submitted', 'under_review', 'waitlisted', 'approved', 'rejected', 'enrolled', 'withdrawn'
  ]));
