-- Adds a 'coordinator' member_role — the owner's explicit "coordinators ya aise hi or bhi boht
-- saare" ask: a principal-appointed role for people who aren't the owner/admin but help run
-- people/academics/attendance/communication without touching billing/org settings. Additive only
-- — every existing row/constraint keeps working, this just widens what a NEW membership row may be.
--
-- The role itself stays a fixed permission bucket (member_role), but the pre-existing free-text
-- `designation` column on {school,college}_memberships lets a principal give this role ANY custom
-- title (Vice Principal, Discipline Incharge, Sports Coordinator, ...) — the app surfaces
-- `designation || member_role` wherever the role would otherwise show, so "coordinator" itself is
-- never forced on end users as the visible label.

alter table public.school_memberships drop constraint school_memberships_member_role_check;
alter table public.school_memberships add constraint school_memberships_member_role_check
  check (member_role in ('owner', 'admin', 'coordinator', 'admissions', 'teacher', 'staff', 'accountant', 'parent', 'student'));

alter table public.college_memberships drop constraint college_memberships_member_role_check;
alter table public.college_memberships add constraint college_memberships_member_role_check
  check (member_role in ('owner', 'admin', 'coordinator', 'admissions', 'teacher', 'staff', 'accountant', 'parent', 'student'));

-- Contact-message routing (the existing within-org inbox) can now target a coordinator too.
alter table public.school_contact_messages drop constraint school_contact_messages_recipient_role_check;
alter table public.school_contact_messages add constraint school_contact_messages_recipient_role_check
  check (recipient_role in ('admin', 'coordinator', 'admissions', 'teacher', 'accountant'));

alter table public.college_contact_messages drop constraint college_contact_messages_recipient_role_check;
alter table public.college_contact_messages add constraint college_contact_messages_recipient_role_check
  check (recipient_role in ('admin', 'coordinator', 'admissions', 'teacher', 'accountant'));
