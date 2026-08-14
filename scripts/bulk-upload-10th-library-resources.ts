// 10th-grade counterpart to bulk-upload-9th-library-resources.ts — same idea,
// different (per-subject) local folder shapes, discovered and verified by hand
// per subject (see chat history / PR description for the reasoning behind each
// offset and section mapping).
//
// Usage:
//   npx tsx --env-file=.env.local scripts/bulk-upload-10th-library-resources.ts --dry-run
//   npx tsx --env-file=.env.local scripts/bulk-upload-10th-library-resources.ts

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { putR2Object } from '../src/lib/storage/r2';

const ROOT = 'E:/data/10th/notes';
const KEY_PREFIX = 'library/';

type Row = {
  subject_slug: string;
  chapter_slug: string;
  chapter_id: string | null;
  content_section: 'reading' | 'mcq' | 'short' | 'long';
  title: string;
  book_title: string;
  light_key: string | null;
  dark_key: string | null;
  context_key: string | null;
  source: { light?: string; dark?: string; txt?: string };
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function titleCase(value: string) {
  return value
    .split(/\s+/)
    .map((w) => (w.length > 2 ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(' ');
}

function extractOrderNumber(folderName: string): number | null {
  const leading = folderName.match(/^(\d+)[.\s]/);
  if (leading) return Number(leading[1]);
  const labelled = folderName.match(/Chapter\s+(\d+)/i) || folderName.match(/Unit\s+(\d+)/i);
  if (labelled) return Number(labelled[1]);
  return null;
}

type Chapter = { name: string; slug: string; order: number; id: string };

const CHAPTERS: Record<string, Chapter[]> = {
  biology: [
    { name: 'Gaseous Exchange', slug: 'g10-gaseous-exchange', order: 1, id: '3fbb76e7-d781-42e9-bce6-0c03963cc9e4' },
    { name: 'Homeostasis', slug: 'g10-homeostasis', order: 2, id: '4560a8c3-fc4e-458a-b815-b426f76622ff' },
    { name: 'Coordination and Control', slug: 'g10-coordination-and-control', order: 3, id: '5c16395f-ef10-4dc6-904d-88fea57e9841' },
    { name: 'Support and Movement', slug: 'g10-support-and-movement', order: 4, id: '91ea8fe5-aed0-4f8b-bd74-ca9b866540c7' },
    { name: 'Reproduction', slug: 'g10-reproduction', order: 5, id: '9ad7f6c5-8810-4bfd-8f92-b497c44e3488' },
    { name: 'Inheritance', slug: 'g10-inheritance', order: 6, id: '199dda61-22ee-458a-b601-7dd7a8b98666' },
    { name: 'Man and His Environment', slug: 'g10-man-and-his-environment', order: 7, id: '7b8e19a7-2726-48e2-9453-a5cef0cac3a3' },
    { name: 'Biotechnology', slug: 'g10-biotechnology', order: 8, id: 'dfebfcb9-4949-4230-94cf-60bbcb2112c7' },
    { name: 'Pharmacology', slug: 'g10-pharmacology', order: 9, id: '808bf1be-349d-4502-a7a8-f4bb42963444' },
  ],
  chemistry: [
    { name: 'States of Matter and Phase Changes', slug: 'g10-states-of-matter-and-phase-changes', order: 1, id: 'f945472e-09ee-421f-a442-5823a952e7a2' },
    { name: 'Stoichiometry', slug: 'g10-stoichiometry', order: 2, id: '8f261cae-4c4e-4661-9d75-ee0e1d42bf63' },
    { name: 'Electrochemistry', slug: 'g10-electrochemistry', order: 3, id: '2a24a6e7-8f2a-4aee-9210-3a7f49599cd4' },
    { name: 'Reaction Kinetics', slug: 'g10-reaction-kinetics', order: 4, id: '3cde66ca-e793-4046-9865-b7322eff361a' },
    { name: 'Salts', slug: 'g10-salts', order: 5, id: '7ab53aaf-e941-486f-9550-0cc001e1e73b' },
    { name: 'Nitrogen and Sulphur', slug: 'g10-nitrogen-and-sulphur', order: 6, id: '972afab0-532f-4eb6-a881-efed69ee9551' },
    { name: 'Water', slug: 'g10-water', order: 7, id: '15853361-a910-4fa5-9b76-e1b84cf1b0c1' },
  ],
  'computer-science': [
    { name: 'Operating Systems: Structure and Services', slug: 'g10-operating-systems-structure-and-services', order: 1, id: 'f7452fd7-7718-4546-817e-81247a50cf49' },
    { name: 'System Recovery and Advanced Maintenance', slug: 'g10-system-recovery-and-advanced-maintenance', order: 2, id: 'fef4ab1f-290c-467a-b122-c05ebb79b763' },
    { name: 'Introduction to Python Programming', slug: 'g10-introduction-to-python-programming', order: 3, id: 'a11a28a0-9525-40b6-b132-ab480763435e' },
    { name: 'Control Structures in Python', slug: 'g10-control-structures-in-python', order: 4, id: 'f76ee598-5a02-4e6b-9c89-b84dd541d083' },
  ],
  physics: [
    { name: 'Thermal Physics', slug: 'g10-thermal-physics', order: 1, id: '41bf940f-4f81-424c-92d8-5e54b14cc42e' },
    { name: 'Transfer of Thermal Energy', slug: 'g10-transfer-of-thermal-energy', order: 2, id: 'a803dcbf-852c-4509-83d7-d2e566564f6e' },
    { name: 'Waves', slug: 'g10-waves', order: 3, id: '3558deee-b5a6-4d99-aae3-4fe2ef096589' },
    { name: 'Sound', slug: 'g10-sound', order: 4, id: '82e8368b-bcc5-4757-8f9d-83c42b321ed5' },
    { name: 'Light', slug: 'g10-light', order: 5, id: 'b9004516-f671-4467-8fcd-791fdee185ad' },
    { name: 'Electrostatics', slug: 'g10-electrostatics', order: 6, id: 'fe38da0e-ceed-48f0-b2ef-26ab43fc28ac' },
  ],
  mathematics: [
    { name: 'Complex Numbers', slug: 'g10-complex-numbers', order: 1, id: '6de9e520-a498-4fc2-b826-b2553700f6b4' },
    { name: 'Quadratic Equations and Inequalities', slug: 'g10-quadratic-equations-and-inequalities', order: 2, id: '28b26dc6-3ac9-4e97-8e5f-73863438382c' },
    { name: 'Matrices and Determinants', slug: 'g10-matrices-and-determinants', order: 3, id: '809d2ed1-b95f-464e-9c77-e4b30abc891c' },
    { name: 'Functions and Graphs', slug: 'g10-functions-and-graphs', order: 4, id: '1aa5b816-5a0f-4063-87a6-47f1ab2b6b44' },
    { name: 'Algebraic Fractions', slug: 'g10-algebraic-fractions', order: 5, id: '96eb9a36-f8d4-44d9-a06b-c74d58ed5d98' },
    { name: 'Vectors in Plane', slug: 'g10-vectors-in-plane', order: 6, id: '97b34fdd-7394-4028-bfa0-6aee000c3d18' },
  ],
  english: [
    { name: "Hazrat Muhammad's (PBUH) Social Reforms for the Rights of Women, Orphans and Slaves", slug: 'g10-hazrat-muhammads-pbuh-social-reforms-for-the-rights-of-women-orphans-and-slaves', order: 1, id: 'f8f5a3c0-fc4e-41b2-98e9-83a5bd4ae11e' },
    { name: 'My Beloved Pakistan', slug: 'g10-my-beloved-pakistan', order: 2, id: 'ececf6f9-3354-4599-b720-2dd8b5768aba' },
    { name: 'Digital Globalisation Transforming the English Language', slug: 'g10-digital-globalisation-transforming-the-english-language', order: 3, id: '80a587f2-ef1f-4455-824b-1ee69c84e8ed' },
    { name: 'The Earth: Act Now for Tomorrow', slug: 'g10-the-earth-act-now-for-tomorrow', order: 4, id: '9f6a59f8-6bc3-4535-9b69-19d9665ba664' },
    { name: 'The Happy Prince', slug: 'g10-the-happy-prince', order: 5, id: '5b126a62-8b87-4a5a-b9b5-5f29c1e4b690' },
    { name: 'Drug Abuse', slug: 'g10-drug-abuse', order: 6, id: '9b376a77-d5ba-481e-9237-633cb6dbfd58' },
    { name: 'Time', slug: 'g10-time', order: 7, id: 'e2805896-cf85-4726-af54-55691df47d6c' },
    { name: 'Pollution-Free Pakistan with Greenery All Around', slug: 'g10-pollution-free-pakistan-with-greenery-all-around', order: 8, id: 'ab7d6fcd-b63a-4154-9b7e-220b9bdc1370' },
    { name: 'The Road Not Taken', slug: 'g10-the-road-not-taken', order: 9, id: 'e2e1d050-d41b-4f23-bcc7-98c21f35b37c' },
    { name: 'The Three Questions', slug: 'g10-the-three-questions', order: 10, id: 'aebf0787-73ca-4282-b673-186b289a936d' },
    { name: 'Review 1', slug: 'g10-review-1', order: 11, id: '2f9208f0-3a2d-4b79-ac9d-aa9255a0bdb1' },
    { name: 'Review 2', slug: 'g10-review-2', order: 12, id: 'bdba9047-833b-4e48-b0e9-afae05f461ab' },
  ],
  'pakistan-studies': [
    { name: 'Ideological Basis of Pakistan', slug: 'g10-ideological-basis-of-pakistan', order: 1, id: '2d422b82-a3a5-46bf-8685-91c2f116aaad' },
    { name: 'Pakistan Movement', slug: 'g10-pakistan-movement', order: 2, id: '41141a45-4983-47e5-bf87-96f9977f4502' },
    { name: 'History of Pakistan (1947-Uptill Now) and Constitutional Development in Pakistan', slug: 'g10-history-of-pakistan-1947-uptill-now-and-constitutional-development-in-pakistan', order: 3, id: 'c64b16b5-504c-44d2-ac38-9d8755762a14' },
    { name: 'Geography of Pakistan', slug: 'g10-geography-of-pakistan', order: 4, id: '07601ea2-3732-4df6-8d01-1d2fa023f116' },
    { name: 'Pakistan and International Affairs', slug: 'g10-pakistan-and-international-affairs', order: 5, id: 'f753ac89-9ef1-41e3-a814-20853b652238' },
    { name: 'Resources and Economic Development of Pakistan', slug: 'g10-resources-and-economic-development-of-pakistan', order: 6, id: '44cd0552-4de6-4ae3-87bc-f62d43428597' },
    { name: 'Population, Society and Cultural Diversity in Pakistan', slug: 'g10-population-society-and-cultural-diversity-in-pakistan', order: 7, id: '52f320d7-5fe9-4c61-b47a-dcfcf11046f7' },
    { name: 'Women Empowerment in Pakistan', slug: 'g10-women-empowerment-in-pakistan', order: 8, id: '8596c945-2975-4678-b427-48aa3cf645e1' },
  ],
  urdu: [
    { name: 'Nazam Hamd', slug: 'g10-nazam-hamd', order: 1, id: 'a0f6f953-f744-4742-bb99-724d0cb7e217' },
    { name: 'Nazam Naat', slug: 'g10-nazam-naat', order: 2, id: 'fe3fbd5e-a179-40a8-b473-0528b936bd07' },
    { name: 'Akhlaq-e-Nabawi (SAW)', slug: 'g10-akhlaq-e-nabawi-saw', order: 3, id: '1411472b-85be-40ae-bf53-54371ae42a10' },
    { name: 'Sir Sayyad Ka Bachpan', slug: 'g10-sir-sayyad-ka-bachpan', order: 4, id: '2d076257-193c-43a7-8368-de56f9a01740' },
    { name: 'Mohsin Muhalla', slug: 'g10-mohsin-muhalla', order: 5, id: 'f6c90b2b-62c5-4bb0-8784-a7d7283b5f9f' },
    { name: 'Kaffara', slug: 'g10-kaffara', order: 6, id: 'a2eb523b-bb2c-4e7c-a4e0-fb2c1ecaa531' },
    { name: 'Sawere Jo Kal Aankh Meri Khuli', slug: 'g10-sawere-jo-kal-aankh-meri-khuli', order: 7, id: '69331723-b2e3-4678-bfab-e06a7c3d345e' },
    { name: 'Dosti Ka Phal', slug: 'g10-dosti-ka-phal', order: 8, id: '4ab3b5de-3ee1-4128-8f5a-8b0671f40e38' },
    { name: 'Mera Gaon', slug: 'g10-mera-gaon', order: 9, id: 'f2ad552f-629c-41a7-b274-66deb98bfc47' },
    { name: 'Babil k Khandar', slug: 'g10-babil-k-khandar', order: 10, id: '7f17dcb9-5143-4062-bded-4659678cc6d2' },
    { name: 'Old Age Home', slug: 'g10-old-age-home', order: 11, id: '37effd9c-4247-4b0c-a0af-a790ed9a6e8e' },
    { name: 'Kuch Zariya Taleem K Bab Main', slug: 'g10-kuch-zariya-taleem-k-bab-main', order: 12, id: 'e23f2ff1-a498-43d5-964a-d21fc153247d' },
  ],
  // These 11 chapters do NOT exist in Supabase yet (g10 Tarjuma Tul Quran has 0
  // rows) — pre-generated fixed UUIDs so the resource-insert SQL can reference
  // them; the chapter-insert SQL (using these SAME ids) must run first.
  'tarjuma-tul-quran': [
    { name: 'Al-Anaam', slug: 'g10-al-anaam', order: 1, id: 'fd6a3beb-3a99-4576-8444-979cc11351b5' },
    { name: 'Al-Araaf', slug: 'g10-al-araaf', order: 2, id: '2eaae1dd-fda8-4e20-9fe8-8cdf7a6a5d21' },
    { name: 'Yunus', slug: 'g10-yunus', order: 3, id: 'eef4819e-051b-41b1-9ac7-974265d904d0' },
    { name: 'Hud', slug: 'g10-hud', order: 4, id: '251c91b2-a622-4065-a4d8-b75407ddcc44' },
    { name: 'Raad', slug: 'g10-raad', order: 5, id: '6ef32b58-52d3-4606-be12-17c8928b0986' },
    { name: 'Ibrahim', slug: 'g10-ibrahim', order: 6, id: 'aefcb773-5bd5-4a23-bce1-277adffe0320' },
    { name: 'Al-Hijr', slug: 'g10-al-hijr', order: 7, id: '0bedbdb2-3395-48b5-87ee-9f9739412e04' },
    { name: 'An-Nahl', slug: 'g10-an-nahl', order: 8, id: '75f98d66-e288-431f-ba79-5736d54a6a20' },
    { name: 'Bani Israel', slug: 'g10-bani-israel', order: 9, id: '41d36233-0b0d-4005-b65d-59552965c71f' },
    { name: 'Kahf', slug: 'g10-kahf', order: 10, id: '305205b3-6fec-45bc-a11e-d64a5d594d40' },
    { name: 'Muminoon', slug: 'g10-muminoon', order: 11, id: '4df036bd-2e19-418a-ba2e-033743527f01' },
  ],
};

const SUBJECT_NAMES: Record<string, string> = {
  biology: 'Biology',
  chemistry: 'Chemistry',
  'computer-science': 'Computer Science',
  physics: 'Physics',
  mathematics: 'Mathematics',
  english: 'English',
  'pakistan-studies': 'Pakistan Studies',
  urdu: 'Urdu',
  'tarjuma-tul-quran': 'Tarjuma Tul Quran',
};

function pushRow(rows: Row[], p: {
  subjectSlug: string; chapterSlug: string; chapterId: string | null; contentSection: Row['content_section'];
  title: string; darkAbs?: string; lightAbs?: string; txtAbs?: string; titleSlug: string;
}) {
  const darkExists = p.darkAbs && existsSync(p.darkAbs);
  const lightExists = p.lightAbs && existsSync(p.lightAbs);
  const txtExists = p.txtAbs && existsSync(p.txtAbs);
  if (!darkExists && !lightExists) return;
  const keyBase = `${KEY_PREFIX}${p.subjectSlug}/${p.chapterSlug}/${p.contentSection}/${p.titleSlug}`;
  rows.push({
    subject_slug: p.subjectSlug,
    chapter_slug: p.chapterSlug,
    chapter_id: p.chapterId,
    content_section: p.contentSection,
    title: p.title,
    book_title: `Class 10 ${SUBJECT_NAMES[p.subjectSlug]} Notes (Punjab)`,
    light_key: lightExists ? `${keyBase}.light.pdf` : darkExists ? `${keyBase}.dark.pdf` : null,
    dark_key: darkExists ? `${keyBase}.dark.pdf` : lightExists ? `${keyBase}.light.pdf` : null,
    context_key: txtExists ? `${keyBase}.context.txt` : null,
    source: { dark: darkExists ? p.darkAbs : undefined, light: lightExists ? p.lightAbs : undefined, txt: txtExists ? p.txtAbs : undefined },
  });
}

// --- Biology / Chemistry: dark/light/txt FIRST, then "<Chapter N – Name>" folder, flat files ---
function discoverChapterModeFirst(subjectSlug: string, folderName: string, orderOffset: number) {
  const rows: Row[] = [];
  const darkBase = path.join(ROOT, folderName, 'dark');
  if (!existsSync(darkBase)) return rows;
  const chapterFolders = readdirSync(darkBase, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
  for (const chapter of CHAPTERS[subjectSlug]!) {
    const folder = chapterFolders.find((name) => extractOrderNumber(name) === chapter.order + orderOffset);
    if (!folder) continue;
    const darkFiles = readdirSync(path.join(darkBase, folder));
    for (const [token, section, label] of [
      ['MCQ', 'mcq', 'MCQs'], // matches both "MCQ" and "MCQs" (e.g. Chemistry's Water chapter uses singular)
      ['ShortQ', 'short', 'Short Questions'],
      ['LongQ', 'long', 'Long Questions'],
    ] as const) {
      const darkFile = darkFiles.find((f) => f.includes(token) && /Dark\.pdf$/i.test(f));
      if (!darkFile) continue;
      const lightFile = darkFile.replace(/Dark\.pdf$/i, 'Light.pdf');
      const txtFile = darkFile.replace(/\.pdf$/i, '.txt');
      pushRow(rows, {
        subjectSlug, chapterSlug: chapter.slug, chapterId: chapter.id, contentSection: section,
        title: `${SUBJECT_NAMES[subjectSlug]} — Chapter ${chapter.order}: ${titleCase(chapter.name)} — ${label}`,
        darkAbs: path.join(darkBase, folder, darkFile),
        lightAbs: path.join(ROOT, folderName, 'light', folder, lightFile),
        txtAbs: path.join(ROOT, folderName, 'txt', folder, txtFile),
        titleSlug: `${slugify(chapter.name)}-${section === 'mcq' ? 'mcqs' : section === 'short' ? 'short-questions' : 'long-questions'}`,
      });
    }
  }
  return rows;
}

// --- Computer Science: same mode-first-chapter-second shape, but each chapter's
// 3 files use inconsistent per-chapter naming (mcqs/shortq/longq, or Ch2_MCQs/Ch2_LongQ
// + a separate exercise file) — match by broad token, and include an extra
// "exercise" file as a 'reading' resource where present. ---
function discoverComputerScience() {
  const rows: Row[] = [];
  const subjectSlug = 'computer-science';
  const darkBase = path.join(ROOT, 'Com', 'dark');
  if (!existsSync(darkBase)) return rows;
  const chapterFolders = readdirSync(darkBase, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
  for (const chapter of CHAPTERS['computer-science']!) {
    const folder = chapterFolders.find((name) => extractOrderNumber(name) === chapter.order);
    if (!folder) continue;
    const darkFiles = readdirSync(path.join(darkBase, folder));
    const sections: { tokens: string[]; section: Row['content_section']; label: string; tag: string }[] = [
      { tokens: ['mcqs', 'MCQs'], section: 'mcq', label: 'MCQs', tag: 'mcqs' },
      { tokens: ['shortq', 'ShortQ'], section: 'short', label: 'Short Questions', tag: 'short-questions' },
      { tokens: ['longq', 'LongQ'], section: 'long', label: 'Long Questions', tag: 'long-questions' },
      { tokens: ['exercise', 'Exercise'], section: 'reading', label: 'Exercise', tag: 'exercise' },
    ];
    for (const { tokens, section, label, tag } of sections) {
      const darkFile = darkFiles.find((f) => tokens.some((t) => f.includes(t)) && /Dark\.pdf$/i.test(f));
      if (!darkFile) continue;
      const lightFile = darkFile.replace(/Dark\.pdf$/i, 'Light.pdf');
      const txtFile = darkFile.replace(/\.pdf$/i, '.txt');
      pushRow(rows, {
        subjectSlug, chapterSlug: chapter.slug, chapterId: chapter.id, contentSection: section,
        title: `Computer Science — Chapter ${chapter.order}: ${titleCase(chapter.name)} — ${label}`,
        darkAbs: path.join(darkBase, folder, darkFile),
        lightAbs: path.join(ROOT, 'Com', 'light', folder, lightFile),
        txtAbs: path.join(ROOT, 'Com', 'txt', folder, txtFile),
        titleSlug: `${slugify(chapter.name)}-${tag}`,
      });
    }
  }
  return rows;
}

// --- Pakistan Studies (Sst): dark/light/txt first, then "<Chapter N – Name (New)>", then mcques/ + notes/ ---
function discoverPakistanStudies() {
  const rows: Row[] = [];
  const subjectSlug = 'pakistan-studies';
  const darkBase = path.join(ROOT, 'Sst', 'dark');
  if (!existsSync(darkBase)) return rows;
  const chapterFolders = readdirSync(darkBase, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
  for (const chapter of CHAPTERS['pakistan-studies']!) {
    const folder = chapterFolders.find((name) => extractOrderNumber(name) === chapter.order);
    if (!folder) continue;
    for (const [sub, section, label, tag] of [
      ['mcques', 'mcq', 'MCQs', 'mcqs'],
      ['notes', 'reading', 'Notes', 'notes'],
    ] as const) {
      const darkDir = path.join(darkBase, folder, sub);
      if (!existsSync(darkDir)) continue;
      const darkFiles = readdirSync(darkDir);
      const darkFile = darkFiles.find((f) => /Dark\.pdf$/i.test(f) || /\.pdf$/i.test(f));
      if (!darkFile) continue;
      const lightFile = darkFile.replace(/Dark/i, 'Light');
      const lightDir = path.join(ROOT, 'Sst', 'light', folder, sub);
      const lightFiles = existsSync(lightDir) ? readdirSync(lightDir) : [];
      const txtDir = path.join(ROOT, 'Sst', 'txt', folder, sub);
      const txtFiles = existsSync(txtDir) ? readdirSync(txtDir) : [];
      pushRow(rows, {
        subjectSlug, chapterSlug: chapter.slug, chapterId: chapter.id, contentSection: section,
        title: `Pakistan Studies — Chapter ${chapter.order}: ${titleCase(chapter.name)} — ${label}`,
        darkAbs: path.join(darkDir, darkFile),
        lightAbs: (lightFiles.includes(lightFile) ? path.join(lightDir, lightFile) : lightFiles[0] && path.join(lightDir, lightFiles[0])) || undefined,
        txtAbs: txtFiles[0] ? path.join(txtDir, txtFiles[0]) : undefined,
        titleSlug: `${slugify(chapter.name)}-${tag}`,
      });
    }
  }
  return rows;
}

// --- Physics: dark/light/txt first, then section (longs/mcques/numericals/shorts), filenames carry ChN ---
function discoverPhysics10() {
  const rows: Row[] = [];
  const subjectSlug = 'physics';
  const sections: { folder: string; section: Row['content_section']; label: string; tag: string }[] = [
    { folder: 'numericals', section: 'reading', label: 'Numericals', tag: 'numericals' },
    { folder: 'mcques', section: 'mcq', label: 'MCQs', tag: 'mcqs' },
    { folder: 'shorts', section: 'short', label: 'Short Questions', tag: 'short-questions' },
    { folder: 'longs', section: 'long', label: 'Long Questions', tag: 'long-questions' },
  ];
  for (const { folder, section, label, tag } of sections) {
    const darkDir = path.join(ROOT, 'Physics', 'dark', folder);
    if (!existsSync(darkDir)) continue;
    const darkFiles = readdirSync(darkDir);
    for (const chapter of CHAPTERS.physics!) {
      const localOrder = chapter.order + 9; // local numbering continues from grade 9 (Ch10-15)
      const darkFile = darkFiles.find((f) => new RegExp(`(Ch|Unit)0?${localOrder}(\\D|$)`, 'i').test(f));
      if (!darkFile) continue;
      const lightFile = darkFile.replace(/Dark/i, 'Light');
      const txtFile = darkFile.replace(/\.pdf$/i, '.txt').replace(/_Dark/i, '');
      pushRow(rows, {
        subjectSlug, chapterSlug: chapter.slug, chapterId: chapter.id, contentSection: section,
        title: `Physics — Chapter ${chapter.order}: ${titleCase(chapter.name)} — ${label}`,
        darkAbs: path.join(darkDir, darkFile),
        lightAbs: path.join(ROOT, 'Physics', 'light', folder, lightFile),
        txtAbs: path.join(ROOT, 'Physics', 'txt', folder, txtFile),
        titleSlug: `${slugify(chapter.name)}-${tag}`,
      });
    }
  }
  return rows;
}

// --- Mathematics: dark/light/txt first, then "<Unit N – Name>", multiple exercise files ---
function extractMathExerciseKey(filename: string): string | null {
  const numMatch = filename.match(/(\d+\.\d+)/);
  if (numMatch) return numMatch[1]!;
  if (/extra/i.test(filename)) return 'extra';
  if (/review/i.test(filename)) return 'review';
  return null;
}

function discoverMath10() {
  const rows: Row[] = [];
  const subjectSlug = 'mathematics';
  const darkBase = path.join(ROOT, 'Math', 'dark');
  if (!existsSync(darkBase)) return rows;
  const unitFolders = readdirSync(darkBase, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
  for (const chapter of CHAPTERS.mathematics!) {
    const folder = unitFolders.find((name) => extractOrderNumber(name) === chapter.order);
    if (!folder) continue;
    const darkDir = path.join(darkBase, folder);
    const darkFiles = readdirSync(darkDir);
    const lightDir = path.join(ROOT, 'Math', 'light', folder);
    const lightFiles = existsSync(lightDir) ? readdirSync(lightDir) : [];
    const txtExDir = path.join(ROOT, 'Math', 'txt', folder, 'exercises');
    const txtMcqDir = path.join(ROOT, 'Math', 'txt', folder, 'mcques');
    const txtExFiles = existsSync(txtExDir) ? readdirSync(txtExDir) : [];
    const txtMcqFiles = existsSync(txtMcqDir) ? readdirSync(txtMcqDir) : [];

    const seen = new Set<string>();
    for (const darkFile of darkFiles) {
      const key = extractMathExerciseKey(darkFile);
      if (!key) continue;
      const isMcq = /mcq/i.test(darkFile);
      const dedupeKey = `${key}-${isMcq ? 'mcq' : 'ex'}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      const lightFile = lightFiles.find((f) => extractMathExerciseKey(f) === key && /mcq/i.test(f) === isMcq);
      const txtFiles = isMcq ? txtMcqFiles : txtExFiles;
      const txtFile = txtFiles.find((f) => extractMathExerciseKey(f) === key);
      const label = key === 'extra' ? 'Extra MCQs' : key === 'review' ? (isMcq ? 'Review Exercise — MCQs' : 'Review Exercise (Solved)') : isMcq ? `Exercise ${key} — MCQs` : `Exercise ${key} (Solved)`;
      pushRow(rows, {
        subjectSlug, chapterSlug: chapter.slug, chapterId: chapter.id, contentSection: isMcq ? 'mcq' : 'reading',
        title: `Mathematics — Chapter ${chapter.order}: ${chapter.name} — ${label}`,
        darkAbs: path.join(darkDir, darkFile),
        lightAbs: lightFile ? path.join(lightDir, lightFile) : undefined,
        txtAbs: txtFile ? path.join(isMcq ? txtMcqDir : txtExDir, txtFile) : undefined,
        titleSlug: `${key}-${isMcq ? 'mcq' : 'ex'}`,
      });
    }
  }
  return rows;
}

// --- English: flat dark/light/txt, one file per chapter (Unit1-3, ch4-10, review1-2) ---
function discoverEnglish10() {
  const rows: Row[] = [];
  const subjectSlug = 'english';
  const darkDir = path.join(ROOT, 'English', 'dark');
  const darkFiles = readdirSync(darkDir);
  for (const chapter of CHAPTERS.english!) {
    const darkFile = darkFiles.find((f) => {
      // "review1"/"review2" are the LAST two chapters (order 11/12), not chapters 1/2 —
      // map that prefix's embedded number onto the tail of the order range instead.
      const reviewMatch = f.match(/^review0?(\d+)/i);
      if (reviewMatch) return chapter.order === 10 + Number(reviewMatch[1]);
      const m = f.match(/^(?:Unit|ch)0?(\d+)/i);
      return Boolean(m && Number(m[1]) === chapter.order);
    });
    if (!darkFile) continue;
    const lightFile = darkFile.replace(/Dark\.pdf$/i, 'Light.pdf');
    const txtFile = darkFile.replace(/\.pdf$/i, '.txt');
    pushRow(rows, {
      subjectSlug, chapterSlug: chapter.slug, chapterId: chapter.id, contentSection: 'reading',
      title: `English — Chapter ${chapter.order}: ${titleCase(chapter.name)} — Notes`,
      darkAbs: path.join(darkDir, darkFile),
      lightAbs: path.join(ROOT, 'English', 'light', lightFile),
      txtAbs: path.join(ROOT, 'English', 'txt', txtFile),
      titleSlug: `${slugify(chapter.name)}-notes`,
    });
  }
  return rows;
}

// --- Urdu: only generic (chapter-less) essay/comprehension practice exists locally ---
function discoverUrdu10() {
  const rows: Row[] = [];
  const subjectSlug = 'urdu';
  const darkDir = path.join(ROOT, 'urdu', 'dark');
  if (!existsSync(darkDir)) return rows;
  const darkFiles = readdirSync(darkDir).filter((f) => /\.pdf$/i.test(f) && !f.startsWith('~$'));
  const groups = ['Ch1-9_Urdu_Essays', 'Ch10-18_Urdu_Essays', 'Ch19-27_Urdu_Essays', 'Ch28-36_Urdu_Essays', 'Tafheem_Ebaraat'];
  for (const group of groups) {
    for (const [token, section, label] of [
      ['MCQs', 'mcq', 'MCQs'],
      ['Notes', 'reading', 'Notes'],
    ] as const) {
      const darkFile = darkFiles.find((f) => f.startsWith(group) && f.includes(token));
      if (!darkFile) continue;
      const lightFile = darkFile.replace(/Dark\.pdf$/i, 'Light.pdf');
      const txtFile = darkFile.replace(/\.pdf$/i, '.txt');
      const readable = group.replace(/_/g, ' ');
      pushRow(rows, {
        subjectSlug, chapterSlug: 'general', chapterId: null, contentSection: section,
        title: `Urdu — ${readable} — ${label}`,
        darkAbs: path.join(darkDir, darkFile),
        lightAbs: path.join(ROOT, 'urdu', 'light', lightFile),
        txtAbs: path.join(ROOT, 'urdu', 'txt', txtFile),
        titleSlug: `${slugify(readable)}-${section}`,
      });
    }
  }
  return rows;
}

// --- Tarjuma Tul Quran: dark/light/txt first, then mcques/ + notes/, matched by surah name ---
const TQ_TOKEN_BY_ORDER: Record<number, string> = {
  1: 'AlAnaam', 2: 'AlAraaf', 3: 'Yunus', 4: 'Hud', 5: 'Raad', 6: 'Ibrahim',
  7: 'AlHijr', 8: 'AnNahl', 9: 'BaniIsrael', 10: 'Kahf', 11: 'Muminoon',
};

function discoverTQ10() {
  const rows: Row[] = [];
  const subjectSlug = 'tarjuma-tul-quran';
  for (const [sub, section, label, tag] of [
    ['notes', 'reading', 'Notes', 'notes'],
    ['mcques', 'mcq', 'MCQs', 'mcqs'],
  ] as const) {
    const darkDir = path.join(ROOT, 'T_Q', 'dark', sub);
    if (!existsSync(darkDir)) continue;
    const darkFiles = readdirSync(darkDir);
    for (const chapter of CHAPTERS['tarjuma-tul-quran']!) {
      const token = TQ_TOKEN_BY_ORDER[chapter.order]!;
      const darkFile = darkFiles.find((f) => f.includes(token));
      if (!darkFile) continue;
      const lightFile = darkFile.replace(/Dark/i, 'Light');
      const txtFile = darkFile.replace(/\.pdf$/i, '.txt').replace(/_Dark/i, '');
      pushRow(rows, {
        subjectSlug, chapterSlug: chapter.slug, chapterId: chapter.id, contentSection: section,
        title: `Tarjuma Tul Quran — Surah ${chapter.name} — ${label}`,
        darkAbs: path.join(darkDir, darkFile),
        lightAbs: path.join(ROOT, 'T_Q', 'light', sub, lightFile),
        txtAbs: path.join(ROOT, 'T_Q', 'txt', sub, txtFile),
        titleSlug: `${slugify(chapter.name)}-${tag}`,
      });
    }
  }
  return rows;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  const rows: Row[] = [
    ...discoverChapterModeFirst('biology', 'Bio', 9),
    ...discoverChapterModeFirst('chemistry', 'Chemistry', 13),
    ...discoverComputerScience(),
    ...discoverPakistanStudies(),
    ...discoverPhysics10(),
    ...discoverMath10(),
    ...discoverEnglish10(),
    ...discoverUrdu10(),
    ...discoverTQ10(),
  ];

  console.log(`Discovered ${rows.length} resources.${dryRun ? ' (DRY RUN)' : ''}`);
  const bySubject: Record<string, number> = {};
  for (const r of rows) bySubject[r.subject_slug] = (bySubject[r.subject_slug] || 0) + 1;
  console.log(bySubject);

  if (!dryRun) {
    let uploaded = 0;
    for (const row of rows) {
      const uploads: Promise<void>[] = [];
      if (row.source.dark && row.dark_key) uploads.push(putR2Object(row.dark_key, readFileSync(row.source.dark), { contentType: 'application/pdf', cacheControl: 'public, max-age=31536000, immutable' }));
      if (row.source.light && row.light_key && row.light_key !== row.dark_key) uploads.push(putR2Object(row.light_key, readFileSync(row.source.light), { contentType: 'application/pdf', cacheControl: 'public, max-age=31536000, immutable' }));
      if (row.source.txt && row.context_key) uploads.push(putR2Object(row.context_key, readFileSync(row.source.txt), { contentType: 'text/plain; charset=utf-8', cacheControl: 'public, max-age=31536000, immutable' }));
      await Promise.all(uploads);
      uploaded++;
      if (uploaded % 20 === 0) console.log(`  uploaded ${uploaded}/${rows.length}...`);
    }
    console.log(`Uploaded ${uploaded} resources' files to B2.`);
  }

  const manifestPath = path.join(process.cwd(), dryRun ? '10th-library-manifest.dryrun.json' : '10th-library-manifest.json');
  writeFileSync(manifestPath, JSON.stringify(rows, null, 2));
  console.log(`Manifest written to: ${manifestPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
