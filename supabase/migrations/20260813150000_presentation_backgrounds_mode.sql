-- The presentation builder theme picker was simplified down to just two modes
-- (dark/light). Each background image now needs its own dark/light tag so the
-- matcher can pick a dark-toned photo for the dark theme (white text overlay)
-- and a light-toned photo for the light theme (dark text overlay) — using the
-- wrong tone would break text contrast.
--
-- Default 'dark' preserves the old behavior for every background uploaded
-- before this column existed (the app always rendered a dark scrim + white
-- text over photos previously).

alter table public.presentation_backgrounds
  add column if not exists mode text not null default 'dark';

alter table public.presentation_backgrounds
  drop constraint if exists presentation_backgrounds_mode_check;

alter table public.presentation_backgrounds
  add constraint presentation_backgrounds_mode_check check (mode in ('dark', 'light'));
