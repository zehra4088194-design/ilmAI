-- Quick Fee Collection / Family Accounts / Defaulters / Ledger feature (school + college parity).
--
-- 1. payment_group_id on school_fee_payments / college_fee_payments: Quick Fee Collection and the
--    family multi-child payer both let one cash receipt settle several fee-head invoices at once —
--    each invoice still gets its own school_fee_payments row (the existing
--    school_apply_fee_payment/college_apply_fee_payment triggers recompute that invoice's
--    paid_amount/status per row, unchanged), but a shared payment_group_id lets the UI render one
--    combined printable voucher for the whole receipt instead of N separate ones.
-- 2. school_expenses / college_expenses: minimal running-costs ledger so the new
--    Ledger/Accounting page can show fees collected vs expenses. No existing table covered this.

alter table public.school_fee_payments add column if not exists payment_group_id uuid;
alter table public.college_fee_payments add column if not exists payment_group_id uuid;
create index if not exists school_fee_payments_group_idx on public.school_fee_payments (payment_group_id) where payment_group_id is not null;
create index if not exists college_fee_payments_group_idx on public.college_fee_payments (payment_group_id) where payment_group_id is not null;

create table if not exists public.school_expenses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.school_organizations(id) on delete cascade,
  category text not null check (category in ('salary', 'utilities', 'maintenance', 'supplies', 'transport', 'events', 'other')),
  description text not null,
  amount numeric(12,2) not null check (amount > 0),
  expense_date date not null default current_date,
  paid_via text not null default 'cash' check (paid_via in ('cash', 'bank', 'card', 'online')),
  notes text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);
create index if not exists school_expenses_org_date_idx on public.school_expenses (organization_id, expense_date desc);

create table if not exists public.college_expenses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.college_organizations(id) on delete cascade,
  category text not null check (category in ('salary', 'utilities', 'maintenance', 'supplies', 'transport', 'events', 'other')),
  description text not null,
  amount numeric(12,2) not null check (amount > 0),
  expense_date date not null default current_date,
  paid_via text not null default 'cash' check (paid_via in ('cash', 'bank', 'card', 'online')),
  notes text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);
create index if not exists college_expenses_org_date_idx on public.college_expenses (organization_id, expense_date desc);

alter table public.school_expenses enable row level security;
alter table public.college_expenses enable row level security;

create policy "school expenses visible to finance and admins"
  on public.school_expenses for select
  using (public.school_has_role(organization_id, array['owner','admin','accountant']));
create policy "school finance manages expenses"
  on public.school_expenses for all
  using (public.school_has_role(organization_id, array['owner','admin','accountant']))
  with check (public.school_has_role(organization_id, array['owner','admin','accountant']));

create policy "college expenses visible to finance and admins"
  on public.college_expenses for select
  using (public.college_has_role(organization_id, array['owner','admin','accountant']));
create policy "college finance manages expenses"
  on public.college_expenses for all
  using (public.college_has_role(organization_id, array['owner','admin','accountant']))
  with check (public.college_has_role(organization_id, array['owner','admin','accountant']));
