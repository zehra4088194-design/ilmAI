-- ============================================
-- SEED DATA: Core Pakistani Board Subjects
-- ============================================

insert into public.subjects (name, slug, code, description, color, boards, grade_levels, total_chapters) values
('Physics', 'physics', 'PHY', 'Mechanics, Heat, Light, Electricity aur Modern Physics', '#2563eb', '{FBISE,BISE_LHR,BISE_KHI,BISE_RWP,BISE_FSD}', '{GRADE_9,GRADE_10,GRADE_11,GRADE_12}', 0),
('Chemistry', 'chemistry', 'CHEM', 'Organic, Inorganic aur Physical Chemistry', '#16a34a', '{FBISE,BISE_LHR,BISE_KHI,BISE_RWP,BISE_FSD}', '{GRADE_9,GRADE_10,GRADE_11,GRADE_12}', 0),
('Biology', 'biology', 'BIO', 'Botany, Zoology aur Human Physiology', '#dc2626', '{FBISE,BISE_LHR,BISE_KHI,BISE_RWP,BISE_FSD}', '{GRADE_9,GRADE_10,GRADE_11,GRADE_12}', 0),
('Mathematics', 'mathematics', 'MATH', 'Algebra, Geometry, Trigonometry aur Calculus', '#7c3aed', '{FBISE,BISE_LHR,BISE_KHI,BISE_RWP,BISE_FSD}', '{GRADE_9,GRADE_10,GRADE_11,GRADE_12}', 0),
('English', 'english', 'ENG', 'Grammar, Comprehension aur Writing Skills', '#d97706', '{FBISE,BISE_LHR,BISE_KHI,BISE_RWP,BISE_FSD}', '{GRADE_9,GRADE_10,GRADE_11,GRADE_12}', 0),
('Urdu', 'urdu', 'URD', 'Nasr, Nazm aur Grammar', '#0891b2', '{FBISE,BISE_LHR,BISE_KHI,BISE_RWP,BISE_FSD}', '{GRADE_9,GRADE_10}', 0),
('Computer Science', 'computer-science', 'CS', 'Programming, Networks aur Databases', '#7c3aed', '{FBISE,BISE_LHR,BISE_KHI}', '{GRADE_9,GRADE_10,GRADE_11,GRADE_12}', 0),
('Islamiat', 'islamiat', 'ISL', 'Quran, Hadith aur Islamic History', '#059669', '{FBISE,BISE_LHR,BISE_KHI,BISE_RWP,BISE_FSD}', '{GRADE_9,GRADE_10}', 0),
('Pakistan Studies', 'pakistan-studies', 'PAKST', 'History, Geography aur Civics', '#6d28d9', '{FBISE,BISE_LHR,BISE_KHI,BISE_RWP,BISE_FSD}', '{GRADE_9,GRADE_10}', 0)
on conflict (slug) do nothing;

-- Sample chapters for Physics (Grade 9-10 FBISE pattern)
insert into public.chapters (subject_id, name, slug, order_index)
select id, c.name, c.slug, c.order_index from public.subjects, (values
  ('Physical Quantities and Measurement', 'physical-quantities-measurement', 1),
  ('Kinematics', 'kinematics', 2),
  ('Dynamics', 'dynamics', 3),
  ('Turning Effect of Forces', 'turning-effect-forces', 4),
  ('Gravitation', 'gravitation', 5),
  ('Work and Energy', 'work-and-energy', 6),
  ('Properties of Matter', 'properties-of-matter', 7),
  ('Thermal Properties of Matter', 'thermal-properties-matter', 8),
  ('Transfer of Heat', 'transfer-of-heat', 9)
) as c(name, slug, order_index)
where subjects.slug = 'physics'
on conflict (subject_id, slug) do nothing;

-- Sample chapters for Mathematics
insert into public.chapters (subject_id, name, slug, order_index)
select id, c.name, c.slug, c.order_index from public.subjects, (values
  ('Matrices and Determinants', 'matrices-determinants', 1),
  ('Real and Complex Numbers', 'real-complex-numbers', 2),
  ('Logarithms', 'logarithms', 3),
  ('Algebraic Expressions', 'algebraic-expressions', 4),
  ('Factorization', 'factorization', 5),
  ('Algebraic Formulas and Applications', 'algebraic-formulas-applications', 6),
  ('Linear Equations and Inequalities', 'linear-equations-inequalities', 7),
  ('Trigonometry', 'trigonometry', 8),
  ('Geometry', 'geometry', 9)
) as c(name, slug, order_index)
where subjects.slug = 'mathematics'
on conflict (subject_id, slug) do nothing;

-- Refresh counts after seeding
select public.refresh_subject_counts();
