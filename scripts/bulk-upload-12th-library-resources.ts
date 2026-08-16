// 12th-grade counterpart to bulk-upload-11th-library-resources.ts — per-subject
// folder shapes discovered by hand this session (see HANDOFF-library-rollout.md).
// Islamiat is intentionally excluded. Biology has NO local content for grade 12
// (no `notes/bio` folder exists) — its 13 DB chapters are simply skipped.
// Tarjuma Tul Quran only has 6 of 17 DB chapters present locally (1,2,3,10,11,12).
// Urdu only has 12 of 14 DB chapters present locally (missing 9, 10) — sourced
// from the `chapter/` folder only; `ghazal/` and `nazam/` folders use an
// unrelated/inconsistent numbering scheme that does NOT map to the 14 DB
// chapters, so they are intentionally skipped rather than guessed at.
// English's `eng/chips/` folder (a "Goodbye Mr Chips" novel) is unrelated to
// the 15 numbered DB chapters and is skipped.
//
// Usage:
//   npx tsx --env-file=.env.local scripts/bulk-upload-12th-library-resources.ts --dry-run
//   npx tsx --env-file=.env.local scripts/bulk-upload-12th-library-resources.ts

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { putR2Object } from '../src/lib/storage/r2';

const ROOT = 'E:/data/12th/notes';
const KEY_PREFIX = 'library/';

type Row = {
  subject_slug: string;
  chapter_slug: string;
  chapter_id: string | null;
  content_section: 'reading' | 'mcq' | 'short' | 'long' | 'numericals';
  title: string;
  book_title: string;
  light_key: string | null;
  dark_key: string | null;
  context_key: string | null;
  source: { light?: string; dark?: string; txt?: string };
};

function slugify(value: string) {
  return value.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function extractOrderNumber(folderName: string): number | null {
  const labelled = folderName.match(/Chapter\s+(\d+)/i) || folderName.match(/Unit\s+(\d+)/i);
  if (labelled) return Number(labelled[1]);
  const leading = folderName.match(/^(\d+)[.\s]/);
  if (leading) return Number(leading[1]);
  return null;
}

// The .txt companion for a given dark PDF doesn't reliably keep the same
// "_Dark" suffix or exact wording across every subject/folder — fuzzy-match
// instead of a single naive replace.
function normalizeForMatch(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '').replace(/dark$/, '').replace(/light$/, '');
}

function findTxtInDir(txtDir: string, darkFile: string): string | null {
  if (!existsSync(txtDir)) return null;
  const txtFiles = readdirSync(txtDir).filter((f) => /\.txt$/i.test(f));
  const darkBase = darkFile.replace(/\.pdf$/i, '');
  const target = normalizeForMatch(darkBase);
  const exact = txtFiles.find((f) => normalizeForMatch(f.replace(/\.txt$/i, '')) === target);
  if (exact) return exact;
  const contained = txtFiles.find((f) => {
    const n = normalizeForMatch(f.replace(/\.txt$/i, ''));
    return n.length > 4 && (target.includes(n) || n.includes(target));
  });
  if (contained) return contained;
  const kindOf = (s: string) => (/short/i.test(s) ? 'short' : /long/i.test(s) ? 'long' : /mcq/i.test(s) ? 'mcq' : /notes/i.test(s) ? 'notes' : null);
  const numOf = (s: string) => s.match(/(\d+)/)?.[1] ?? null;
  const targetKind = kindOf(darkBase);
  const targetNum = numOf(darkBase);
  if (targetKind) {
    const sameKind = txtFiles.filter((f) => kindOf(f) === targetKind);
    const numMatch = targetNum ? sameKind.find((f) => numOf(f) === targetNum) : undefined;
    if (numMatch) return numMatch;
    if (sameKind.length === 1) return sameKind[0]!;
  }
  if (targetNum) {
    const numMatches = txtFiles.filter((f) => numOf(f) === targetNum);
    if (numMatches.length === 1) return numMatches[0]!;
  }
  return null;
}

type Chapter = { name: string; slug: string; order: number; id: string };

const CHAPTERS: Record<string, Chapter[]> = {
  chemistry: [
    { name: 'Periodic Classification of Elements & Periodicity', slug: 'g12-periodic-classification-of-elements-periodicity', order: 1, id: '5ea55344-61a5-4e85-84ae-786525f93612' },
    { name: 's-Block Elements', slug: 'g12-s-block-elements', order: 2, id: '6f9bdb53-80f7-4f8e-bf3d-e636c10fed37' },
    { name: 'Group III-A and Group IV-A Elements', slug: 'g12-group-iii-a-and-group-iv-a-elements', order: 3, id: 'd1f77762-5221-46b7-b8f2-5e3e16a5cc02' },
    { name: 'Group V-A and VI-A Elements', slug: 'g12-group-v-a-and-vi-a-elements', order: 4, id: 'ef73960b-1b84-414d-b107-580a84c61d7f' },
    { name: 'The Halogen and the Noble Gases', slug: 'g12-the-halogen-and-the-noble-gases', order: 5, id: 'db07c058-f699-4ce6-b501-bd004f67eecf' },
    { name: 'Transition Elements', slug: 'g12-transition-elements', order: 6, id: '01eab586-a1c3-4222-af21-9a71521dc4bd' },
    { name: 'Fundamental Principles of Organic Chemistry', slug: 'g12-fundamental-principles-of-organic-chemistry', order: 7, id: '1fac8966-b5d8-4078-9fac-ad1c03b63959' },
    { name: 'Alphatic Hydrocarbons', slug: 'g12-alphatic-hydrocarbons', order: 8, id: '54c26d1f-5950-45ed-af91-19d0a6ba0c1a' },
    { name: 'Aromatic Hydrocarbons', slug: 'g12-aromatic-hydrocarbons', order: 9, id: '5be6662e-d451-46f4-9671-2e78559e9031' },
    { name: 'Alkyle Halides', slug: 'g12-alkyle-halides', order: 10, id: 'b2c05c9b-5898-4f46-8e2e-e2282be42b6c' },
    { name: 'Alcohol, Phenols and Ethers', slug: 'g12-alcohol-phenols-and-ethers', order: 11, id: '8282bd6a-00ba-4422-9607-4e38b7c46667' },
    { name: 'Aldehydes and Ketones', slug: 'g12-aldehydes-and-ketones', order: 12, id: 'a12d9242-7f09-48d1-9b85-2de1a82b175e' },
    { name: 'Carboxylic Acids', slug: 'g12-carboxylic-acids', order: 13, id: '9c104c58-38b5-4361-8655-512a30a8f60b' },
    { name: 'Macromolecules', slug: 'g12-macromolecules', order: 14, id: 'cc063517-cb38-458e-9075-a634ca2ba001' },
    { name: 'Common Chemical Industries', slug: 'g12-common-chemical-industries', order: 15, id: 'e7072b31-9a14-4689-b262-5005a1d58ed1' },
    { name: 'Environmental Chemistry', slug: 'g12-environmental-chemistry', order: 16, id: '41921360-8b36-4292-8018-77083761d797' },
  ],
  'computer-science': [
    { name: 'Data Basics', slug: 'g12-data-basics', order: 1, id: 'dfdba44c-3d9c-4862-86de-9e0d5bf716f6' },
    { name: 'Basic Concepts and Terminology of Databases', slug: 'g12-basic-concepts-and-terminology-of-databases', order: 2, id: '569bfd25-217a-4534-b4dc-91b22526983e' },
    { name: 'Database Design Process', slug: 'g12-database-design-process', order: 3, id: '80a20fcc-bacf-4def-b363-a6f5410652a8' },
    { name: 'Data Integrity and Normalization', slug: 'g12-data-integrity-and-normalization', order: 4, id: '0c5b788b-425b-4667-bdf3-dcbdfa9dffc8' },
    { name: 'Introduction to Microsoft Access', slug: 'g12-introduction-to-microsoft-access', order: 5, id: 'bd444802-38a0-43c4-9e2d-a9408d69e1e6' },
    { name: 'Table and Query', slug: 'g12-table-and-query', order: 6, id: 'daaa1470-d13c-4f1e-906b-ee028bc8f2c2' },
    { name: 'Microsoft Access Forms and Reports', slug: 'g12-microsoft-access-forms-and-reports', order: 7, id: 'be023c5e-2441-48e0-9d65-27b7f999ff9f' },
    { name: 'Getting Started with C', slug: 'g12-getting-started-with-c', order: 8, id: '98743aec-c754-4584-8105-d1d03703353e' },
    { name: 'Elements of C', slug: 'g12-elements-of-c', order: 9, id: '3a437894-da7a-440f-94a7-34ff4405c2fe' },
    { name: 'Input/Output', slug: 'g12-inputoutput', order: 10, id: '68f3881a-6813-4cf5-b5a3-4521f6be0f92' },
    { name: 'Decision Constructs', slug: 'g12-decision-constructs', order: 11, id: 'e1df634e-fb4f-4a6f-b44e-d9b057178786' },
    { name: 'Loop Constructs', slug: 'g12-loop-constructs', order: 12, id: '8b041a91-5fd3-4248-b707-6aa17247214d' },
    { name: 'Functions in C', slug: 'g12-functions-in-c', order: 13, id: '46a56baf-5209-4d25-bf94-e496f438e15d' },
    { name: 'File Handling in C', slug: 'g12-file-handling-in-c', order: 14, id: '5ee69cdd-572c-4d77-8d2f-66731a765196' },
  ],
  physics: [
    { name: 'Electrostatics', slug: 'g12-electrostatics', order: 1, id: '0ee917bd-9b98-41b8-91d8-a92d65d94616' },
    { name: 'Current Electricity', slug: 'g12-current-electricity', order: 2, id: '17ed00ba-1e08-496f-8803-26fcd9850b72' },
    { name: 'Electromagnetism', slug: 'g12-electromagnetism', order: 3, id: 'dd8a4207-dfc5-4136-af67-8c32d6e457d5' },
    { name: 'Electromagnetic Induction', slug: 'g12-electromagnetic-induction', order: 4, id: '78742b95-dee1-4eda-9bb2-371e5619f5ee' },
    { name: 'Alternating Current', slug: 'g12-alternating-current', order: 5, id: 'c844b9a2-56df-4fc2-8039-c2e4d2c48136' },
    { name: 'Physics of Solids', slug: 'g12-physics-of-solids', order: 6, id: '577c099b-9328-4f68-8a66-9c680c2f13dc' },
    { name: 'Electronics', slug: 'g12-electronics', order: 7, id: '2ccf6cd6-84db-4844-b906-a447c2b43533' },
    { name: 'Dawn Of Modern Physics', slug: 'g12-dawn-of-modern-physics', order: 8, id: 'ae4e4ff0-5674-4931-84e8-2c3b53d359dc' },
    { name: 'Atomic Spectra', slug: 'g12-atomic-spectra', order: 9, id: 'bc5ddcef-1de7-409c-a0c0-cee860e50654' },
    { name: 'Nuclear Physics', slug: 'g12-nuclear-physics', order: 10, id: '6f31de2a-55b8-4dc9-96de-7dcce95d6ba4' },
  ],
  mathematics: [
    { name: 'Functions and Limits', slug: 'g12-functions-and-limits', order: 1, id: '6f0e039e-6281-47f5-95b8-ad46fff808ef' },
    { name: 'Differentiation', slug: 'g12-differentiation', order: 2, id: '2d803e2f-2878-46f8-87ab-9ce069ae6e7c' },
    { name: 'Integration', slug: 'g12-integration', order: 3, id: 'dc83b5b6-438c-4a8b-8a4e-d7dfd957e5e9' },
    { name: 'Introduction to Analytic Geometry', slug: 'g12-introduction-to-analytic-geometry', order: 4, id: '6958f942-4918-4cc0-8565-736c94caef8e' },
    { name: 'Linear Inequalities & Linear Programming', slug: 'g12-linear-inequalities-linear-programming', order: 5, id: 'e46cc8fd-1954-4674-b5ff-6c4936547c38' },
    { name: 'Conic Section', slug: 'g12-conic-section', order: 6, id: 'aa27da99-cb65-41a1-a7eb-cd27c9552864' },
    { name: 'Vectors', slug: 'g12-vectors', order: 7, id: 'bb8d2972-3938-44e6-8ef7-81902f5e34ae' },
  ],
  'pakistan-studies': [
    { name: 'Islam aur Pakistan', slug: 'g12-islam-aur-pakistan', order: 1, id: 'a05088d0-8f3f-422c-b331-81964d6b4342' },
    { name: 'Siyasi aur Aini Irtiqa', slug: 'g12-siyasi-aur-aini-irtiqa', order: 2, id: '257296dc-3c09-4eb9-a005-666491d814a7' },
    { name: 'Intezami Nizam', slug: 'g12-intezami-nizam', order: 3, id: '0df95632-8fdc-4f32-ba88-287e39fdf30d' },
    { name: 'Insani Huqooq', slug: 'g12-insani-huqooq', order: 4, id: '8c060edd-734d-413d-b41c-1027e7548f86' },
    { name: 'Pakistan ka Nizam-e-Taleem', slug: 'g12-pakistan-ka-nizam-e-taleem', order: 5, id: '516be57a-7fd1-4512-92b4-aa10876593c3' },
    { name: 'Khail aur Sair-o-Siyahat', slug: 'g12-khail-aur-sair-o-siyahat', order: 6, id: '559e0696-441d-41ee-a987-bb7a9e607768' },
  ],
  'tarjuma-tul-quran': [
    { name: 'Surah An-Nisa', slug: 'g12-surah-an-nisa', order: 1, id: '3756975c-541f-44c5-a6d1-eb7b0660ffe6' },
    { name: "Surah Al-Ma'idah", slug: 'g12-surah-al-maidah', order: 2, id: '5644379e-710c-4fb0-bcb8-4734b7304c97' },
    { name: 'Surah An-Nur', slug: 'g12-surah-an-nur', order: 3, id: '01155e48-8257-43fe-923d-4f3fd8358fbd' },
    { name: 'Surah Al-Ahzab', slug: 'g12-surah-al-ahzab', order: 4, id: '2151de96-1a35-4638-8779-419b2cab220c' },
    { name: 'Surah Muhammad', slug: 'g12-surah-muhammad', order: 5, id: '03cc0022-2765-44ca-927e-c9b9fddeb0c3' },
    { name: 'Surah Al-Fath', slug: 'g12-surah-al-fath', order: 6, id: '6834aa3e-816e-4f60-83cd-a7872cc9bfbf' },
    { name: 'Surah Al-Hujurat', slug: 'g12-surah-al-hujurat', order: 7, id: '47c7c3d4-04ad-473d-a36b-01f67022e4ec' },
    { name: 'Surah Al-Hadid', slug: 'g12-surah-al-hadid', order: 8, id: '01d6106b-5d0d-475b-a900-16241749c078' },
    { name: 'Surah Al-Mujadila', slug: 'g12-surah-al-mujadila', order: 9, id: '0ded1616-bf80-4f29-9b87-28d7858961b3' },
    { name: 'Surah Al-Hashr', slug: 'g12-surah-al-hashr', order: 10, id: 'a8a93593-d782-41b3-8fde-8ea79e952e3b' },
    { name: 'Surah Al-Mumtahanah', slug: 'g12-surah-al-mumtahanah', order: 11, id: 'd8c906d5-ae30-4bdb-b603-816fb71b227f' },
    { name: 'Surah As-Saf', slug: 'g12-surah-as-saf', order: 12, id: '30a97538-ae76-4a5b-a5b3-75effb1a03ad' },
    { name: "Surah Al-Jumu'ah", slug: 'g12-surah-al-jumuah', order: 13, id: '4e52048e-a049-4410-8aee-cbd13c65f7ad' },
    { name: 'Surah Al-Munafiqun', slug: 'g12-surah-al-munafiqun', order: 14, id: 'ae252c5b-5e7b-43fb-bd9b-43e7cb6fdc93' },
    { name: 'Surah At-Taghabun', slug: 'g12-surah-at-taghabun', order: 15, id: '156a42af-d4ba-487f-8270-ad34b21bb187' },
    { name: 'Surah At-Talaq', slug: 'g12-surah-at-talaq', order: 16, id: '08dc188d-d03c-451e-93e4-55fca513dcd7' },
    { name: 'Surah At-Tahrim', slug: 'g12-surah-at-tahrim', order: 17, id: '0161270e-6433-4606-8f5f-83b44c34ef0a' },
  ],
  english: [
    { name: 'The Dying Sun', slug: 'g12-the-dying-sun', order: 1, id: '11af3d18-229f-4716-92f1-f099a901b990' },
    { name: 'Using The Scientific Method', slug: 'g12-using-the-scientific-method', order: 2, id: '6291c304-68d4-406b-af02-08ac2ab4e848' },
    { name: 'Why Boys Fail in College', slug: 'g12-why-boys-fail-in-college', order: 3, id: '828100d6-7618-45ab-a07d-0fcc3668ceab' },
    { name: 'End of Term', slug: 'g12-end-of-term', order: 4, id: 'e1128f8f-5dd1-4bbb-851d-248aeb3cfd7a' },
    { name: 'On Destroying Books', slug: 'g12-on-destroying-books', order: 5, id: 'b9186c2e-eb9e-425b-8fc3-17d74ead2f5c' },
    { name: 'The Man Who was a Hospital', slug: 'g12-the-man-who-was-a-hospital', order: 6, id: 'e1adcb80-c70f-4c7c-bf71-18e2d2097573' },
    { name: 'My Financial Career', slug: 'g12-my-financial-career', order: 7, id: 'e9463cb1-9587-41f7-b3ef-96b4cf16d466' },
    { name: "China's Way to Progress", slug: 'g12-chinas-way-to-progress', order: 8, id: 'ff8a7388-5176-41e0-98a9-36dae7be8ec5' },
    { name: 'Hunger and Population Explosion', slug: 'g12-hunger-and-population-explosion', order: 9, id: 'efe9d78a-97f0-4b56-bdec-2e509a32a103' },
    { name: 'The Jewel of The world', slug: 'g12-the-jewel-of-the-world', order: 10, id: '58bb0c6a-be29-4e9e-8fc9-998ae2f97b0c' },
    { name: 'First Year at Harrow', slug: 'g12-first-year-at-harrow', order: 11, id: '3899150f-2220-4e51-a7a3-967947cdce61' },
    { name: 'Hitch Hiking Across the Sahara', slug: 'g12-hitch-hiking-across-the-sahara', order: 12, id: 'bb2f5586-eed6-42df-b291-2b1ec1585963' },
    { name: 'Sir Alexander Fleming', slug: 'g12-sir-alexander-fleming', order: 13, id: 'a7af2559-4523-477d-8b69-9e6a5fa70e27' },
    { name: 'Louis Pasteur', slug: 'g12-louis-pasteur', order: 14, id: '5f97d979-e713-4db4-b3b1-0fa73a98760f' },
    { name: 'Mustafa Kamal', slug: 'g12-mustafa-kamal', order: 15, id: '4e735793-6e4e-4ef3-9b0f-eddef5551f72' },
  ],
  urdu: [
    { name: 'Manaqib Umar Bin Abdul Aziz', slug: 'g12-manaqib-umar-bin-abdul-aziz', order: 1, id: '63bda776-cfc9-479d-83c2-7b914fee6515' },
    { name: 'Tashkeel e Pakistan', slug: 'g12-tashkeel-e-pakistan', order: 2, id: '5302dd77-8b4e-4459-9fe3-37d953af3d2d' },
    { name: 'Nawab Mohsin ul Malik', slug: 'g12-nawab-mohsin-ul-malik', order: 3, id: 'a6701105-d43c-4226-8ce4-98e98ff1c597' },
    { name: 'Mehnat Pasand Khirad Mand', slug: 'g12-mehnat-pasand-khirad-mand', order: 4, id: '92764ffa-fe38-4a96-87fc-5ba989778549' },
    { name: 'Akbari ki Hamaqatein', slug: 'g12-akbari-ki-hamaqatein', order: 5, id: 'e3b70bbc-ce16-4f64-9d4f-cd51003394e2' },
    { name: 'Pehli Fatah', slug: 'g12-pehli-fatah', order: 6, id: 'e7c3fefa-ec3b-46f0-a451-01cf52636768' },
    { name: 'Dastak', slug: 'g12-dastak', order: 7, id: 'ebf25b08-5d64-4d1c-b5b2-2ce558b2f067' },
    { name: 'Hawai', slug: 'g12-hawai', order: 8, id: 'c8c816ce-0e07-4550-8654-bbea9efa77ca' },
    { name: 'Molana Zafar Ali', slug: 'g12-molana-zafar-ali', order: 9, id: 'f275410c-6c39-4f49-b409-44c90fee0caa' },
    { name: 'Qartaba ka Qazi', slug: 'g12-qartaba-ka-qazi', order: 10, id: '11912a54-3d50-44e6-abf4-4440bc73991a' },
    { name: 'Mawasalat', slug: 'g12-mawasalat', order: 11, id: 'd18f28ee-eb14-4b2e-a43c-93c96a804a35' },
    { name: 'Molvi Nazeer Ahmad', slug: 'g12-molvi-nazeer-ahmad', order: 12, id: 'a30f439d-c18b-47b4-92e4-700b2cde4be7' },
    { name: 'Ek Safarnama', slug: 'g12-ek-safarnama', order: 13, id: '68a88cfe-94f9-4c9c-b523-e34cc5d90d83' },
    { name: 'Ayub Abassi', slug: 'g12-ayub-abassi', order: 14, id: 'e944e823-ccd8-466d-a951-7c3884371ca6' },
  ],
};

const SUBJECT_NAMES: Record<string, string> = {
  chemistry: 'Chemistry',
  'computer-science': 'Computer Science',
  physics: 'Physics',
  mathematics: 'Mathematics',
  'pakistan-studies': 'Pakistan Studies',
  'tarjuma-tul-quran': 'Tarjuma Tul Quran',
  english: 'English',
  urdu: 'Urdu',
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
    book_title: `Class 12 ${SUBJECT_NAMES[p.subjectSlug]} Notes (Punjab)`,
    light_key: lightExists ? `${keyBase}.light.pdf` : darkExists ? `${keyBase}.dark.pdf` : null,
    dark_key: darkExists ? `${keyBase}.dark.pdf` : lightExists ? `${keyBase}.light.pdf` : null,
    context_key: txtExists ? `${keyBase}.context.txt` : null,
    source: { dark: darkExists ? p.darkAbs : undefined, light: lightExists ? p.lightAbs : undefined, txt: txtExists ? p.txtAbs : undefined },
  });
}

// --- Chemistry / Computer Science: FLAT files directly under the subject root
// (no dark/light/txt subfolder split), named "Ch<N>_<Name>[_Section]_(Dark|Light).pdf".
// Some chapters have duplicate/legacy-named files from earlier regeneration passes
// (e.g. both "..._ShortQuestions_Dark.pdf" and "..._Shorts_Dark.pdf") — first match wins. ---
function discoverFlatBySections(subjectSlug: 'chemistry' | 'computer-science', folderName: string) {
  const rows: Row[] = [];
  const dir = path.join(ROOT, folderName);
  if (!existsSync(dir)) return rows;
  const allFiles = readdirSync(dir);
  const darkFiles = allFiles.filter((f) => /Dark\.pdf$/i.test(f)).sort();
  for (const chapter of CHAPTERS[subjectSlug]!) {
    const chapterFiles = darkFiles.filter((f) => {
      const m = f.match(/^Ch0?(\d+)_/i);
      return Boolean(m && Number(m[1]) === chapter.order);
    });
    const categories: { test: (f: string) => boolean; section: Row['content_section']; label: string; tag: string }[] = [
      { test: (f) => /mcq/i.test(f), section: 'mcq', label: 'MCQs', tag: 'mcqs' },
      { test: (f) => /long/i.test(f), section: 'long', label: 'Long Questions', tag: 'long-questions' },
      { test: (f) => /short/i.test(f), section: 'short', label: 'Short Questions', tag: 'short-questions' },
      { test: (f) => !/mcq|long|short/i.test(f), section: 'reading', label: 'Notes', tag: 'notes' },
    ];
    for (const { test, section, label, tag } of categories) {
      const darkFile = chapterFiles.find(test);
      if (!darkFile) continue;
      const lightFile = darkFile.replace(/Dark\.pdf$/i, 'Light.pdf');
      const txtFile = findTxtInDir(dir, darkFile);
      pushRow(rows, {
        subjectSlug, chapterSlug: chapter.slug, chapterId: chapter.id, contentSection: section,
        title: `${SUBJECT_NAMES[subjectSlug]} — Chapter ${chapter.order}: ${chapter.name} — ${label}`,
        darkAbs: path.join(dir, darkFile),
        lightAbs: path.join(dir, lightFile),
        txtAbs: txtFile ? path.join(dir, txtFile) : undefined,
        titleSlug: `${slugify(chapter.name)}-${tag}`,
      });
    }
  }
  return rows;
}

// --- Physics: mcques/ (MCQ) + notes/ (single reading/solved file per chapter),
// each with dark/light/txt subfolders. Local chapter numbers continue from
// grade 11 (Ch12-21 = g12 order 1-10). ---
function discoverPhysics12() {
  const rows: Row[] = [];
  const subjectSlug = 'physics';
  for (const [sub, section, label, tag] of [
    ['mcques', 'mcq', 'MCQs', 'mcqs'],
    ['notes', 'reading', 'Notes', 'notes'],
  ] as const) {
    const darkDir = path.join(ROOT, 'phy', sub, 'dark');
    if (!existsSync(darkDir)) continue;
    const darkFiles = readdirSync(darkDir);
    for (const chapter of CHAPTERS.physics!) {
      const localOrder = chapter.order + 11;
      const darkFile = darkFiles.find((f) => new RegExp(`^Ch0?${localOrder}_`, 'i').test(f));
      if (!darkFile) continue;
      const lightFile = darkFile.replace(/Dark\.pdf$/i, 'Light.pdf');
      const base = darkFile.replace(/_?Dark\.pdf$/i, '');
      const txtDir = path.join(ROOT, 'phy', sub, 'txt');
      const txtFiles = existsSync(txtDir) ? readdirSync(txtDir) : [];
      const txtFile = txtFiles.find((f) => f.startsWith(base.split('_').slice(0, 2).join('_')));
      pushRow(rows, {
        subjectSlug, chapterSlug: chapter.slug, chapterId: chapter.id, contentSection: section,
        title: `Physics — Chapter ${chapter.order}: ${chapter.name} — ${label}`,
        darkAbs: path.join(darkDir, darkFile),
        lightAbs: path.join(ROOT, 'phy', sub, 'light', lightFile),
        txtAbs: txtFile ? path.join(txtDir, txtFile) : undefined,
        titleSlug: `${slugify(chapter.name)}-${tag}`,
      });
    }
  }
  return rows;
}

// --- Mathematics: dark/light/txt first, then "Unit N – Name" folder, per-exercise
// files ("cha-1_exer-1.1_dark.pdf" solved, "cha-1_exer-1.1_mcqs_dark.pdf" mcq),
// plus a chapter-wide "cha-N_mcqs-bank_dark.pdf" extra MCQ bank. ---
function extractMathExerciseKey(filename: string): string {
  const numMatch = filename.match(/(\d+\.\d+)/);
  if (numMatch) return numMatch[1]!;
  if (/mcqs-bank/i.test(filename)) return 'bank';
  return 'other';
}

function discoverMath12() {
  const rows: Row[] = [];
  const subjectSlug = 'mathematics';
  const darkBase = path.join(ROOT, 'math', 'dark');
  if (!existsSync(darkBase)) return rows;
  const unitFolders = readdirSync(darkBase, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
  for (const chapter of CHAPTERS.mathematics!) {
    const folder = unitFolders.find((name) => extractOrderNumber(name) === chapter.order);
    if (!folder) continue;
    const darkDir = path.join(darkBase, folder);
    const darkFiles = readdirSync(darkDir);
    const lightDir = path.join(ROOT, 'math', 'light', folder);
    const lightFiles = existsSync(lightDir) ? readdirSync(lightDir) : [];
    const txtDir = path.join(ROOT, 'math', 'txt', folder);
    const txtFiles = existsSync(txtDir) ? readdirSync(txtDir) : [];

    const seen = new Set<string>();
    for (const darkFile of darkFiles) {
      const key = extractMathExerciseKey(darkFile);
      const isMcq = /mcq/i.test(darkFile);
      const dedupeKey = `${key}-${isMcq ? 'mcq' : 'ex'}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      const lightFile = lightFiles.find((f) => extractMathExerciseKey(f) === key && /mcq/i.test(f) === isMcq);
      const txtFile =
        txtFiles.find((f) => extractMathExerciseKey(f) === key && /mcq/i.test(f) === isMcq && (isMcq ? true : /solved/i.test(f))) ||
        findTxtInDir(txtDir, darkFile);
      const label = key === 'bank' ? 'MCQ Bank' : isMcq ? `Exercise ${key} — MCQs` : `Exercise ${key} (Solved)`;
      pushRow(rows, {
        subjectSlug, chapterSlug: chapter.slug, chapterId: chapter.id, contentSection: isMcq ? 'mcq' : 'reading',
        title: `Mathematics — Chapter ${chapter.order}: ${chapter.name} — ${label}`,
        darkAbs: path.join(darkDir, darkFile),
        lightAbs: lightFile ? path.join(lightDir, lightFile) : undefined,
        txtAbs: txtFile ? path.join(txtDir, txtFile) : undefined,
        titleSlug: `${key}-${isMcq ? 'mcq' : 'ex'}`,
      });
    }
  }
  return rows;
}

// --- Pakistan Studies (Sst): "Chapter N – Name" folder first, then dark/light/txt,
// flat ch<n>_(long|mcques|short) files. ---
function discoverPakistanStudies12() {
  const rows: Row[] = [];
  const subjectSlug = 'pakistan-studies';
  const sstDir = path.join(ROOT, 'Sst');
  if (!existsSync(sstDir)) return rows;
  const chapterFolders = readdirSync(sstDir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
  for (const chapter of CHAPTERS['pakistan-studies']!) {
    const folder = chapterFolders.find((name) => extractOrderNumber(name) === chapter.order);
    if (!folder) continue;
    const darkDir = path.join(sstDir, folder, 'dark');
    if (!existsSync(darkDir)) continue;
    const darkFiles = readdirSync(darkDir);
    for (const [token, section, label, tag] of [
      ['mcques', 'mcq', 'MCQs', 'mcqs'],
      ['short', 'short', 'Short Questions', 'short-questions'],
      ['long', 'long', 'Long Questions', 'long-questions'],
    ] as const) {
      const darkFile = darkFiles.find((f) => f.toLowerCase().includes(token));
      if (!darkFile) continue;
      const lightFile = darkFile.replace(/dark/i, 'light');
      const txtDirSst = path.join(sstDir, folder, 'txt');
      const txtFile = findTxtInDir(txtDirSst, darkFile);
      pushRow(rows, {
        subjectSlug, chapterSlug: chapter.slug, chapterId: chapter.id, contentSection: section,
        title: `Pakistan Studies — Chapter ${chapter.order}: ${chapter.name} — ${label}`,
        darkAbs: path.join(darkDir, darkFile),
        lightAbs: path.join(sstDir, folder, 'light', lightFile),
        txtAbs: txtFile ? path.join(txtDirSst, txtFile) : undefined,
        titleSlug: `${slugify(chapter.name)}-${tag}`,
      });
    }
  }
  return rows;
}

// --- Tarjuma Tul Quran: flat "<N>_SurahName_(MCQs50|Notes)_(Dark|Light).pdf".
// Only chapters 1,2,3,10,11,12 exist locally out of 17 in the DB. ---
function discoverTQ12() {
  const rows: Row[] = [];
  const subjectSlug = 'tarjuma-tul-quran';
  const dir = path.join(ROOT, 'T_Q');
  if (!existsSync(dir)) return rows;
  const darkFiles = readdirSync(dir).filter((f) => /Dark\.pdf$/i.test(f));
  for (const chapter of CHAPTERS['tarjuma-tul-quran']!) {
    const chapterFiles = darkFiles.filter((f) => {
      const m = f.match(/^(\d+)_/);
      return Boolean(m && Number(m[1]) === chapter.order);
    });
    for (const [token, section, label, tag] of [
      [/mcq/i, 'mcq', 'MCQs', 'mcqs'],
      [/notes/i, 'reading', 'Notes', 'notes'],
    ] as const) {
      const darkFile = chapterFiles.find((f) => token.test(f));
      if (!darkFile) continue;
      const lightFile = darkFile.replace(/Dark\.pdf$/i, 'Light.pdf');
      const txtFile = findTxtInDir(dir, darkFile);
      pushRow(rows, {
        subjectSlug, chapterSlug: chapter.slug, chapterId: chapter.id, contentSection: section,
        title: `Tarjuma Tul Quran — ${chapter.name} — ${label}`,
        darkAbs: path.join(dir, darkFile),
        lightAbs: path.join(dir, lightFile),
        txtAbs: txtFile ? path.join(dir, txtFile) : undefined,
        titleSlug: `${slugify(chapter.name)}-${tag}`,
      });
    }
  }
  return rows;
}

// --- English: flat, single reading file per chapter "Ch<N>_Name_(Dark|Light).pdf". ---
function discoverEnglish12() {
  const rows: Row[] = [];
  const subjectSlug = 'english';
  const dir = path.join(ROOT, 'eng', 'chapters');
  if (!existsSync(dir)) return rows;
  const darkFiles = readdirSync(dir).filter((f) => /Dark\.pdf$/i.test(f));
  for (const chapter of CHAPTERS.english!) {
    const darkFile = darkFiles.find((f) => {
      const m = f.match(/^Ch0?(\d+)_/i);
      return Boolean(m && Number(m[1]) === chapter.order);
    });
    if (!darkFile) continue;
    const lightFile = darkFile.replace(/Dark\.pdf$/i, 'Light.pdf');
    const txtFile = findTxtInDir(dir, darkFile);
    pushRow(rows, {
      subjectSlug, chapterSlug: chapter.slug, chapterId: chapter.id, contentSection: 'reading',
      title: `English — Chapter ${chapter.order}: ${chapter.name} — Notes`,
      darkAbs: path.join(dir, darkFile),
      lightAbs: path.join(dir, lightFile),
      txtAbs: txtFile ? path.join(dir, txtFile) : undefined,
      titleSlug: `${slugify(chapter.name)}-notes`,
    });
  }
  return rows;
}

// --- Urdu: sourced ONLY from `chapter/` (flat "<NN>_Name_(MCQs..|Notes)_(Dark|Light).pdf"),
// numbered 01-14 matching DB order directly. `ghazal/` and `nazam/` folders are
// skipped — their internal numbering is inconsistent and doesn't map to the 14
// DB chapters (verified by hand this session). Chapters 9 and 10 have no local
// content in `chapter/` either (files jump from 08 to 11). ---
function discoverUrdu12() {
  const rows: Row[] = [];
  const subjectSlug = 'urdu';
  const dir = path.join(ROOT, 'urdu', 'chapter');
  if (!existsSync(dir)) return rows;
  const darkFiles = readdirSync(dir).filter((f) => /Dark\.pdf$/i.test(f));
  for (const chapter of CHAPTERS.urdu!) {
    const chapterFiles = darkFiles.filter((f) => {
      const m = f.match(/^0?(\d+)_/);
      return Boolean(m && Number(m[1]) === chapter.order);
    });
    for (const [token, section, label, tag] of [
      [/mcq/i, 'mcq', 'MCQs', 'mcqs'],
      [/notes/i, 'reading', 'Notes', 'notes'],
    ] as const) {
      const darkFile = chapterFiles.find((f) => token.test(f));
      if (!darkFile) continue;
      const lightFile = darkFile.replace(/Dark\.pdf$/i, 'Light.pdf');
      const txtFile = findTxtInDir(dir, darkFile);
      pushRow(rows, {
        subjectSlug, chapterSlug: chapter.slug, chapterId: chapter.id, contentSection: section,
        title: `Urdu — ${chapter.name} — ${label}`,
        darkAbs: path.join(dir, darkFile),
        lightAbs: path.join(dir, lightFile),
        txtAbs: txtFile ? path.join(dir, txtFile) : undefined,
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
    ...discoverFlatBySections('chemistry', 'chem'),
    ...discoverFlatBySections('computer-science', 'com'),
    ...discoverPhysics12(),
    ...discoverMath12(),
    ...discoverPakistanStudies12(),
    ...discoverTQ12(),
    ...discoverEnglish12(),
    ...discoverUrdu12(),
  ];

  console.log(`Discovered ${rows.length} resources.${dryRun ? ' (DRY RUN)' : ''}`);
  const bySubject: Record<string, number> = {};
  for (const r of rows) bySubject[r.subject_slug] = (bySubject[r.subject_slug] || 0) + 1;
  console.log(bySubject);

  if (!dryRun) {
    let uploaded = 0;
    for (const row of rows) {
      const uploads: Promise<void>[] = [];
      if (row.source.dark && row.dark_key) uploads.push(putR2Object(row.dark_key, readFileSync(row.source.dark), { contentType: 'application/pdf', cacheControl: 'public, max-age=31536000, immutable' }, process.env.SECONDARY_STORAGE_BUCKET));
      if (row.source.light && row.light_key && row.light_key !== row.dark_key) uploads.push(putR2Object(row.light_key, readFileSync(row.source.light), { contentType: 'application/pdf', cacheControl: 'public, max-age=31536000, immutable' }, process.env.SECONDARY_STORAGE_BUCKET));
      if (row.source.txt && row.context_key) uploads.push(putR2Object(row.context_key, readFileSync(row.source.txt), { contentType: 'text/plain; charset=utf-8', cacheControl: 'public, max-age=31536000, immutable' }, process.env.SECONDARY_STORAGE_BUCKET));
      await Promise.all(uploads);
      uploaded++;
      if (uploaded % 20 === 0) console.log(`  uploaded ${uploaded}/${rows.length}...`);
    }
    console.log(`Uploaded ${uploaded} resources' files to B2.`);
  }

  const manifestPath = path.join(process.cwd(), dryRun ? '12th-library-manifest.dryrun.json' : '12th-library-manifest.json');
  writeFileSync(manifestPath, JSON.stringify(rows, null, 2));
  console.log(`Manifest written to: ${manifestPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
