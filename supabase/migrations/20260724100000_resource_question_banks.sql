-- Extend processed resource banks beyond MCQs so both student practice and
-- teacher papers can be assembled from uploaded companion text.

alter table public.resource_mcq_sets
  add column if not exists short_questions jsonb not null default '[]'::jsonb,
  add column if not exists long_questions jsonb not null default '[]'::jsonb;

update public.resource_processing_jobs jobs
set status = 'queued',
    attempts = 0,
    last_error = null,
    locked_at = null,
    completed_at = null,
    updated_at = now()
where exists (
  select 1
  from public.resource_mcq_sets banks
  where banks.resource_kind = jobs.resource_kind
    and banks.resource_id = jobs.resource_id
    and (
      jsonb_array_length(banks.short_questions) = 0
      or jsonb_array_length(banks.long_questions) = 0
    )
);
