-- ============================================
-- SEED 002: Complete FBISE/Punjab Chapter Data
-- Extracted from the static site's CH object + expanded for Class 11/12
-- ============================================

-- Helper: insert chapters for a subject/class combo
DO $$
DECLARE
  sub_id uuid;
  ch_idx int;
BEGIN

-- ============ PHYSICS ============
SELECT id INTO sub_id FROM public.subjects WHERE slug = 'physics';
IF sub_id IS NOT NULL THEN
  -- Physics Class 9
  INSERT INTO public.chapters (subject_id, name, slug, order_index) VALUES
    (sub_id, 'Physical Quantities and Measurement',  'physical-quantities-measurement',  1),
    (sub_id, 'Kinematics',                           'kinematics',                        2),
    (sub_id, 'Dynamics',                             'dynamics',                          3),
    (sub_id, 'Turning Effect of Forces',             'turning-effect-forces',             4),
    (sub_id, 'Gravitation',                          'gravitation',                       5),
    (sub_id, 'Work and Energy',                      'work-and-energy',                   6),
    (sub_id, 'Properties of Matter',                 'properties-of-matter',              7),
    (sub_id, 'Thermal Properties of Matter',         'thermal-properties-matter',          8),
    (sub_id, 'Transfer of Heat',                     'transfer-of-heat',                  9),
    -- Physics Class 10
    (sub_id, 'Simple Harmonic Motion and Waves',     'simple-harmonic-motion-waves',      10),
    (sub_id, 'Sound',                                'sound',                             11),
    (sub_id, 'Geometrical Optics',                   'geometrical-optics',               12),
    (sub_id, 'Electrostatics',                       'electrostatics-10',                13),
    (sub_id, 'Current Electricity',                  'current-electricity-10',           14),
    (sub_id, 'Electromagnetism',                     'electromagnetism-10',              15),
    (sub_id, 'Basic Electronics',                    'basic-electronics',                16),
    (sub_id, 'Information and Communication Technology', 'ict-10',                       17),
    (sub_id, 'Atomic and Nuclear Physics',           'atomic-nuclear-physics-10',        18),
    -- Physics Class 11
    (sub_id, 'Measurements (FSc I)',                 'measurements-11',                  19),
    (sub_id, 'Vectors and Equilibrium',              'vectors-equilibrium',              20),
    (sub_id, 'Motion and Force',                     'motion-and-force',                 21),
    (sub_id, 'Work and Energy (FSc I)',              'work-energy-11',                   22),
    (sub_id, 'Circular Motion',                      'circular-motion',                  23),
    (sub_id, 'Fluid Dynamics',                       'fluid-dynamics',                   24),
    (sub_id, 'Oscillations',                         'oscillations',                     25),
    (sub_id, 'Waves',                                'waves',                            26),
    (sub_id, 'Physical Optics',                      'physical-optics',                  27),
    (sub_id, 'Thermodynamics',                       'thermodynamics',                   28),
    (sub_id, 'Electrostatics (FSc I)',               'electrostatics-11',                29),
    -- Physics Class 12
    (sub_id, 'Electrostatics (FSc II)',              'electrostatics-12',                30),
    (sub_id, 'Current Electricity (FSc II)',         'current-electricity-12',           31),
    (sub_id, 'Electromagnetism (FSc II)',            'electromagnetism-12',              32),
    (sub_id, 'Electromagnetic Induction',            'electromagnetic-induction',        33),
    (sub_id, 'Alternating Current',                  'alternating-current',              34),
    (sub_id, 'Physics of Solids',                    'physics-of-solids',                35),
    (sub_id, 'Electronics',                          'electronics-12',                   36),
    (sub_id, 'Dawn of Modern Physics',               'dawn-modern-physics',              37),
    (sub_id, 'Atomic Spectra',                       'atomic-spectra',                   38),
    (sub_id, 'Nuclear Physics',                      'nuclear-physics',                  39)
  ON CONFLICT (subject_id, slug) DO NOTHING;
END IF;

-- ============ CHEMISTRY ============
SELECT id INTO sub_id FROM public.subjects WHERE slug = 'chemistry';
IF sub_id IS NOT NULL THEN
  INSERT INTO public.chapters (subject_id, name, slug, order_index) VALUES
    (sub_id, 'Fundamentals of Chemistry',              'fundamentals-chemistry',            1),
    (sub_id, 'Structure of Atoms',                    'structure-of-atoms',                2),
    (sub_id, 'Periodic Table and Periodicity',        'periodic-table-periodicity',        3),
    (sub_id, 'Structure of Molecules',                'structure-of-molecules',            4),
    (sub_id, 'Physical States of Matter',             'physical-states-matter',            5),
    (sub_id, 'Solutions',                             'solutions-9',                       6),
    (sub_id, 'Electrochemistry (Class 9)',            'electrochemistry-9',                7),
    (sub_id, 'Chemical Reactivity',                   'chemical-reactivity',               8),
    (sub_id, 'Chemical Equilibrium (Class 10)',       'chemical-equilibrium-10',           9),
    (sub_id, 'Acids, Bases and Salts',                'acids-bases-salts',                10),
    (sub_id, 'Organic Chemistry — Introduction',      'organic-chemistry-intro',          11),
    (sub_id, 'Hydrocarbons (Class 10)',               'hydrocarbons-10',                  12),
    (sub_id, 'Alkyl Halides, Alcohols, Aldehydes',   'alkyl-halides-alcohols',           13),
    (sub_id, 'Carboxylic Acids (Class 10)',           'carboxylic-acids-10',              14),
    (sub_id, 'Macromolecules — Polymers (Class 10)', 'macromolecules-10',                15),
    (sub_id, 'The Atmosphere',                        'the-atmosphere',                   16),
    (sub_id, 'Water (Chemistry)',                     'water-chemistry',                  17),
    (sub_id, 'Chemical Industries in Pakistan',       'chemical-industries',              18),
    (sub_id, 'Basic Concepts of Chemistry (FSc I)',   'basic-concepts-11',                19),
    (sub_id, 'Experimental Techniques',               'experimental-techniques',          20),
    (sub_id, 'Gases',                                 'gases',                            21),
    (sub_id, 'Liquids and Solids',                    'liquids-and-solids',               22),
    (sub_id, 'Atomic Structure (FSc I)',              'atomic-structure-11',              23),
    (sub_id, 'Chemical Bonding',                      'chemical-bonding',                 24),
    (sub_id, 'Thermochemistry',                       'thermochemistry',                  25),
    (sub_id, 'Chemical Equilibrium (FSc I)',          'chemical-equilibrium-11',          26),
    (sub_id, 'Solutions (FSc I)',                     'solutions-11',                     27),
    (sub_id, 'Electrochemistry (FSc I)',              'electrochemistry-11',              28),
    (sub_id, 'Reaction Kinetics',                     'reaction-kinetics',                29),
    (sub_id, 'Periodic Classification (FSc II)',      'periodic-classification-12',       30),
    (sub_id, 's-Block Elements',                      's-block-elements',                 31),
    (sub_id, 'p-Block Elements',                      'p-block-elements',                 32),
    (sub_id, 'Carbon and Silicon',                    'carbon-and-silicon',               33),
    (sub_id, 'Transition Elements — d and f Block',  'transition-elements',              34),
    (sub_id, 'Fundamental Principles of Organic Chem','principles-organic-12',           35),
    (sub_id, 'Hydrocarbons (FSc II)',                 'hydrocarbons-12',                  36),
    (sub_id, 'Alkyl Halides (FSc II)',                'alkyl-halides-12',                 37),
    (sub_id, 'Alcohols, Phenols and Ethers',          'alcohols-phenols-ethers',          38),
    (sub_id, 'Aldehydes and Ketones',                 'aldehydes-ketones',                39),
    (sub_id, 'Carboxylic Acids (FSc II)',             'carboxylic-acids-12',              40),
    (sub_id, 'Macromolecules (FSc II)',               'macromolecules-12',                41),
    (sub_id, 'Environmental Chemistry',               'environmental-chemistry',          42)
  ON CONFLICT (subject_id, slug) DO NOTHING;
END IF;

-- ============ BIOLOGY ============
SELECT id INTO sub_id FROM public.subjects WHERE slug = 'biology';
IF sub_id IS NOT NULL THEN
  INSERT INTO public.chapters (subject_id, name, slug, order_index) VALUES
    (sub_id, 'Introduction to Biology',              'intro-biology',                     1),
    (sub_id, 'Solving a Biological Problem',         'biological-problem-solving',        2),
    (sub_id, 'Biodiversity',                         'biodiversity',                      3),
    (sub_id, 'Cells and Cell Organelles',            'cells-organelles',                  4),
    (sub_id, 'Cell Cycle',                           'cell-cycle',                        5),
    (sub_id, 'Enzymes',                              'enzymes',                           6),
    (sub_id, 'Bioenergetics',                        'bioenergetics-9',                   7),
    (sub_id, 'Nutrition (Class 9)',                  'nutrition-9',                       8),
    (sub_id, 'Transport (Class 9)',                  'transport-9',                       9),
    (sub_id, 'Gaseous Exchange',                     'gaseous-exchange',                 10),
    (sub_id, 'Homeostasis (Class 10)',               'homeostasis-10',                   11),
    (sub_id, 'Coordination and Control (Class 10)', 'coordination-control-10',          12),
    (sub_id, 'Support and Movement (Class 10)',      'support-movement-10',              13),
    (sub_id, 'Reproduction (Class 10)',              'reproduction-10',                  14),
    (sub_id, 'Man and His Environment (Class 10)',   'man-environment-10',               15),
    (sub_id, 'Pharmacology',                         'pharmacology-10',                  16),
    (sub_id, 'Biotechnology (Class 10)',             'biotechnology-10',                 17),
    (sub_id, 'Cell Structure and Function (FSc I)', 'cell-structure-11',                18),
    (sub_id, 'Biological Molecules',                 'biological-molecules',             19),
    (sub_id, 'Enzymes (FSc I)',                      'enzymes-11',                       20),
    (sub_id, 'Variety of Life',                      'variety-of-life',                  21),
    (sub_id, 'Kingdom Prokaryotae (Monera)',         'kingdom-monera',                   22),
    (sub_id, 'Kingdom Protoctista',                  'kingdom-protoctista',              23),
    (sub_id, 'Kingdom Fungi',                        'kingdom-fungi',                    24),
    (sub_id, 'Kingdom Plantae',                      'kingdom-plantae',                  25),
    (sub_id, 'Kingdom Animalia',                     'kingdom-animalia',                 26),
    (sub_id, 'Bioenergetics (FSc I)',                'bioenergetics-11',                 27),
    (sub_id, 'Nutrition (FSc I)',                    'nutrition-11',                     28),
    (sub_id, 'Homeostasis (FSc II)',                 'homeostasis-12',                   29),
    (sub_id, 'Support and Movement (FSc II)',        'support-movement-12',              30),
    (sub_id, 'Nervous System (FSc II)',              'nervous-system-12',                31),
    (sub_id, 'Endocrine System',                     'endocrine-system',                 32),
    (sub_id, 'Reproduction (FSc II)',                'reproduction-12',                  33),
    (sub_id, 'Development and Growth',               'development-growth',               34),
    (sub_id, 'Mendelian Genetics',                   'mendelian-genetics',               35),
    (sub_id, 'Variation and Genetics',               'variation-genetics',               36),
    (sub_id, 'Evolution',                            'evolution',                        37),
    (sub_id, 'Man and His Environment (FSc II)',     'man-environment-12',               38),
    (sub_id, 'Man and His Health',                   'man-health',                       39),
    (sub_id, 'Gene Therapy and Biotechnology',      'gene-therapy-biotech',             40)
  ON CONFLICT (subject_id, slug) DO NOTHING;
END IF;

-- ============ MATHEMATICS ============
SELECT id INTO sub_id FROM public.subjects WHERE slug = 'mathematics';
IF sub_id IS NOT NULL THEN
  INSERT INTO public.chapters (subject_id, name, slug, order_index) VALUES
    -- Class 9
    (sub_id, 'Matrices and Determinants',              'matrices-determinants',             1),
    (sub_id, 'Real and Complex Numbers',               'real-complex-numbers',              2),
    (sub_id, 'Logarithms',                             'logarithms',                        3),
    (sub_id, 'Algebraic Expressions and Formulas',     'algebraic-expressions-formulas',    4),
    (sub_id, 'Factorization',                          'factorization',                     5),
    (sub_id, 'Algebraic Manipulation',                 'algebraic-manipulation',            6),
    (sub_id, 'Linear Equations and Inequalities',      'linear-equations-inequalities',     7),
    (sub_id, 'Linear Graphs and Applications',         'linear-graphs-applications',        8),
    (sub_id, 'Introduction to Coordinate Geometry',   'coordinate-geometry-9',             9),
    (sub_id, 'Congruent Triangles',                    'congruent-triangles',              10),
    (sub_id, 'Parallelograms and Triangles',           'parallelograms-triangles',         11),
    (sub_id, 'Line Bisectors and Angle Bisectors',     'line-angle-bisectors',             12),
    (sub_id, 'Sides and Angles of a Triangle',         'sides-angles-triangle',            13),
    (sub_id, 'Ratio and Proportion',                   'ratio-proportion',                 14),
    (sub_id, 'Pythagoras Theorem',                     'pythagoras-theorem',               15),
    (sub_id, 'Theorems Related with Area',             'theorems-area',                    16),
    -- Class 10
    (sub_id, 'Quadratic Equations (Class 10)',         'quadratic-equations-10',           17),
    (sub_id, 'Theory of Quadratic Equations',         'theory-quadratic-equations',        18),
    (sub_id, 'Variations',                             'variations',                       19),
    (sub_id, 'Partial Fractions (Class 10)',           'partial-fractions-10',             20),
    (sub_id, 'Sets and Functions',                     'sets-and-functions-10',            21),
    (sub_id, 'Basic Statistics',                       'basic-statistics',                 22),
    (sub_id, 'Introduction to Trigonometry',          'intro-trigonometry',               23),
    (sub_id, 'Projection of a Side of a Triangle',    'projection-side-triangle',         24),
    (sub_id, 'Chords of a Circle',                    'chords-of-circle',                 25),
    (sub_id, 'Tangent to a Circle',                   'tangent-to-circle',                26),
    (sub_id, 'Chords and Arcs',                       'chords-and-arcs',                  27),
    (sub_id, 'Angle in a Segment of a Circle',        'angle-segment-circle',             28),
    (sub_id, 'Practical Geometry',                    'practical-geometry',               29),
    -- Class 11 (FSc I)
    (sub_id, 'Number Systems (FSc I)',                 'number-systems-11',                30),
    (sub_id, 'Sets, Functions and Groups',             'sets-functions-groups',            31),
    (sub_id, 'Matrices and Determinants (FSc I)',     'matrices-determinants-11',          32),
    (sub_id, 'Quadratic Equations (FSc I)',            'quadratic-equations-11',           33),
    (sub_id, 'Partial Fractions (FSc I)',              'partial-fractions-11',             34),
    (sub_id, 'Sequences and Series',                   'sequences-series',                 35),
    (sub_id, 'Permutations, Combinations, Probability','perms-combs-probability',          36),
    (sub_id, 'Mathematical Induction and Binomial',   'induction-binomial',               37),
    -- Class 12 (FSc II)
    (sub_id, 'Functions and Limits',                  'functions-limits',                 38),
    (sub_id, 'Differentiation',                       'differentiation',                  39),
    (sub_id, 'Integration',                           'integration',                      40),
    (sub_id, 'Introduction to Analytic Geometry',     'analytic-geometry',                41),
    (sub_id, 'Linear Inequalities and LP',            'linear-inequalities-lp',           42),
    (sub_id, 'Conic Sections',                        'conic-sections',                   43),
    (sub_id, 'Vectors (FSc II)',                      'vectors-12',                       44)
  ON CONFLICT (subject_id, slug) DO NOTHING;
END IF;

-- ============ COMPUTER SCIENCE ============
SELECT id INTO sub_id FROM public.subjects WHERE slug = 'computer-science';
IF sub_id IS NOT NULL THEN
  INSERT INTO public.chapters (subject_id, name, slug, order_index) VALUES
    (sub_id, 'Introduction to Computer',              'intro-computer-9',                  1),
    (sub_id, 'Information Networks',                  'information-networks-9',            2),
    (sub_id, 'Operating System (Class 9)',            'operating-system-9',                3),
    (sub_id, 'Fundamental of Programming',            'fundamental-programming',           4),
    (sub_id, 'Algorithms',                            'algorithms',                        5),
    (sub_id, 'Flow Charts',                           'flow-charts',                       6),
    (sub_id, 'Introduction to Database',              'intro-database-10',                 7),
    (sub_id, 'Microsoft Access',                      'ms-access',                         8),
    (sub_id, 'Information Networks (Class 10)',       'information-networks-10',           9),
    (sub_id, 'Internet and Email',                    'internet-email',                   10),
    (sub_id, 'Microsoft Excel',                       'ms-excel',                         11),
    (sub_id, 'Introduction to Programming (Class 10)','intro-programming-10',            12),
    (sub_id, 'Introduction to CS (FSc I)',            'intro-cs-11',                      13),
    (sub_id, 'Computer Architecture',                 'computer-architecture',            14),
    (sub_id, 'Operating Systems (FSc I)',             'operating-systems-11',             15),
    (sub_id, 'Number Systems and Boolean Algebra',    'number-systems-boolean',           16),
    (sub_id, 'Problem Solving and Programming',       'problem-solving-programming',      17),
    (sub_id, 'Introduction to OOP',                   'intro-oop',                        18),
    (sub_id, 'Algorithms and Flowcharts (FSc I)',    'algorithms-flowcharts-11',          19),
    (sub_id, 'Database Design Introduction',          'database-design-intro',            20),
    (sub_id, 'OOP — Advanced (FSc II)',              'oop-advanced-12',                  21),
    (sub_id, 'GUI Programming',                       'gui-programming',                  22),
    (sub_id, 'Arrays and Collections',                'arrays-collections',               23),
    (sub_id, 'File Handling',                         'file-handling',                    24),
    (sub_id, 'Database — SQL Basics',                'database-sql',                     25),
    (sub_id, 'Internet and Web Technologies',         'internet-web-tech',                26),
    (sub_id, 'Software Development Process',          'software-development-process',     27),
    (sub_id, 'Computational Thinking',                'computational-thinking',           28)
  ON CONFLICT (subject_id, slug) DO NOTHING;
END IF;

END $$;

-- Refresh all counts
SELECT public.refresh_subject_counts();

-- ============ SEED ACHIEVEMENTS ============
INSERT INTO public.achievements (name, description, icon_url, xp_reward, condition_type, condition_value) VALUES
  ('First Steps',       'Complete your first quiz',                     '🎯', 50,  'quizzes_completed',   1),
  ('Quick Learner',     'Complete 5 quizzes',                           '📚', 100, 'quizzes_completed',   5),
  ('Quiz Master',       'Complete 25 quizzes',                          '🏆', 300, 'quizzes_completed',  25),
  ('Perfect Score',     'Score 100% on any quiz',                       '⭐', 200, 'perfect_scores',      1),
  ('Week Warrior',      'Study 7 days in a row',                        '🔥', 150, 'streak_days',         7),
  ('Fortnight Fighter', 'Study 14 days in a row',                       '💎', 400, 'streak_days',        14),
  ('AI Explorer',       'Send your first AI message',                   '🤖', 30,  'ai_messages',         1),
  ('Deep Thinker',      'Send 50 AI messages',                          '🧠', 200, 'ai_messages',        50),
  ('Bookworm',          'Study for 10 hours total',                     '📖', 200, 'study_minutes',     600),
  ('Scholar',           'Study for 50 hours total',                     '🎓', 500, 'study_minutes',    3000),
  ('Flashcard Fan',     'Review 50 flashcards',                         '🃏', 100, 'flashcards_reviewed', 50),
  ('OCR Pioneer',       'Scan your first image',                        '📷', 75,  'ocr_scans',           1),
  ('Note Taker',        'Create 10 notes',                              '📝', 100, 'notes_created',      10),
  ('Profile Complete',  'Complete your profile setup',                  '✅', 100, 'profile_complete',    1),
  ('Subject Sampler',   'Study at least 3 different subjects',          '🎨', 150, 'subjects_studied',    3),
  ('Top Scorer',        'Rank in top 10 on leaderboard',                '👑', 500, 'leaderboard_rank',   10)
ON CONFLICT DO NOTHING;
