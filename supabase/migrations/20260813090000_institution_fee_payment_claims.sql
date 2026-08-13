-- Master prompt Part 6.3: student/parent-facing fee payment. Reuses Part 6.2's
-- manual-claim pattern (JazzCash/Easypaisa/Bank/Card + admin verification) but
-- scoped to a specific fee invoice instead of an institution plan purchase.
-- Verifying a claim inserts a real row into {school,college}_fee_payments —
-- the existing trg_{school,college}_apply_fee_payment trigger on that table
-- already reconciles the invoice's paid_amount/status, so nothing new is
-- needed there.

create table if not exists public.institution_fee_payment_claims (
  id uuid primary key default gen_random_uuid(),
  institution_type text not null check (institution_type in ('school', 'college')),
  organization_id uuid not null,
  invoice_id uuid not null,
  student_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  method text not null check (method in ('jazzcash', 'easypaisa', 'bank_transfer', 'card')),
  contact_email text not null,
  notes text,
  status text not null default 'pending_review' check (status in ('pending_review', 'verified', 'rejected')),
  submitted_by uuid references public.profiles(id) on delete set null,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default now()
);

create index if not exists institution_fee_payment_claims_invoice_idx
  on public.institution_fee_payment_claims (institution_type, invoice_id);
create index if not exists institution_fee_payment_claims_org_status_idx
  on public.institution_fee_payment_claims (institution_type, organization_id, status);

comment on table public.institution_fee_payment_claims is
  'Master prompt Part 6.3 — pending manual fee-invoice payment claims from a student/parent, awaiting the institution finance team''s (fees.manage permission) manual verification. Reuses the same method-picker UI as institution_payment_verifications (Part 6.2) but targets a fee invoice instead of a plan purchase.';

alter table public.institution_fee_payment_claims enable row level security;

-- A student/parent may only claim payment for their OWN invoice — checked at the
-- app layer (submitFeePaymentClaim resolves the invoice's student_id server-side
-- and confirms the caller is that student or a linked+approved guardian) before
-- insert; this policy is the DB-level backstop using the same submitted_by check.
drop policy if exists institution_fee_payment_claims_insert on public.institution_fee_payment_claims;
create policy institution_fee_payment_claims_insert on public.institution_fee_payment_claims
  for insert
  with check (submitted_by = auth.uid());

drop policy if exists institution_fee_payment_claims_select on public.institution_fee_payment_claims;
create policy institution_fee_payment_claims_select on public.institution_fee_payment_claims
  for select
  using (
    submitted_by = auth.uid()
    or public.is_institution_owner_or_admin(institution_type, organization_id)
  );

-- Review (verify/reject) goes through the service-role fees.manage-gated action
-- only, same as every other fee-mutation path in this codebase (recordFeePayment).
