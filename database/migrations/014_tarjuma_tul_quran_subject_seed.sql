-- ============================================
-- MIGRATION: Tarjuma Tul Quran subject
-- Added directly in Supabase (production) without a matching local seed —
-- this file just documents/replays that so a fresh/local DB matches
-- production. Safe to re-run: `on conflict (slug) do nothing`.
-- ============================================

insert into public.subjects (name, slug, code, description, color, boards, grade_levels, total_chapters) values
('Tarjuma Tul Quran', 'tarjuma-tul-quran', 'TTQ', null, '#7c3aed', '{}', '{GRADE_9,GRADE_10,GRADE_11,GRADE_12}', 0)
on conflict (slug) do nothing;

select public.refresh_subject_counts();
