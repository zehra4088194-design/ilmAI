-- JazzCash SMS auto-verification (whatsapp-worker + src/app/api/sms-receiver,
-- src/app/api/payments/jazzcash/verify). Mirrors the migration already applied to the remote
-- project via the Supabase MCP tool (apply_migration name: jazzcash_auto_verify).

-- Raw incoming-SMS ledger, written only by the SMS webhook receiver (service role, bypasses RLS
-- below). `consumed_at`/`consumed_by` are set atomically the moment a TID is spent activating a
-- plan, so the SAME real transaction can never be replayed against a second account/claim — the
-- exact-match-by-TID check alone doesn't prevent reuse without this.
create table if not exists public.received_jazzcash_sms (
  id bigint generated always as identity primary key,
  tid text not null unique,
  amount numeric not null,
  raw_text text,
  consumed_at timestamptz,
  -- e.g. 'individual:<user_id>' or 'institution:<claim_id>' — free-text audit trail, not a FK
  -- (the two id spaces it can point into differ), kept simple on purpose.
  consumed_by text,
  created_at timestamptz not null default now()
);

create index if not exists received_jazzcash_sms_unconsumed_idx
  on public.received_jazzcash_sms (created_at desc) where consumed_at is null;

alter table public.received_jazzcash_sms enable row level security;
create policy "platform admins read received jazzcash sms"
  on public.received_jazzcash_sms for select
  using (public.school_is_platform_admin());

-- Per-claim short code an institution admin includes with their WhatsApp transaction ID —
-- generated at submission time in submitInstitutionPaymentVerification(). Nullable/non-unique-
-- enforced-only-when-set so existing pre-feature rows (all null) don't collide.
alter table public.institution_payment_verifications add column if not exists claim_code text;
create unique index if not exists institution_payment_verifications_claim_code_uidx
  on public.institution_payment_verifications (claim_code) where claim_code is not null;

-- Private bucket for payment-proof screenshots forwarded over WhatsApp (worker uploads with the
-- service-role key; never made public, no anon/authenticated storage policies are added here on
-- purpose — only the service role and the Supabase dashboard can read these).
insert into storage.buckets (id, name, public)
values ('jazzcash-payment-proofs', 'jazzcash-payment-proofs', false)
on conflict (id) do nothing;
