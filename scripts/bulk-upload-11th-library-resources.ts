// 11th-grade counterpart to bulk-upload-10th-library-resources.ts — per-subject
// folder shapes discovered by hand this session (see HANDOFF-library-rollout.md).
// Islamiat is intentionally excluded. Biology has NO local content for grade 11
// (no `notes/bio` folder exists) — its 12 DB chapters are simply skipped.
//
// Usage:
//   npx tsx --env-file=.env.local scripts/bulk-upload-11th-library-resources.ts --dry-run
//   npx tsx --env-file=.env.local scripts/bulk-upload-11th-library-resources.ts

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { putR2Object } from '../src/lib/storage/r2';

const ROOT = 'E:/data/11th/notes';
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
// "_Dark" suffix or exact wording across every subject/folder (verified by
// hand: some do, some don't) — fuzzy-match instead of a single naive replace.
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
  const kindOf = (s: string) => (/short/i.test(s) ? 'short' : /long/i.test(s) ? 'long' : /mcq/i.test(s) ? 'mcq' : /exercise/i.test(s) ? 'exercise' : null);
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
    { name: 'Periodic Table and Periodic Properties', slug: 'g11-periodic-table-and-periodic-properties', order: 1, id: '27d5112c-a477-4928-9c98-572c1acdddd1' },
    { name: 'Atomic Structure', slug: 'g11-atomic-structure', order: 2, id: '5d569763-0bc5-4e34-9475-b26192921c15' },
    { name: 'Chemical Bonding', slug: 'g11-chemical-bonding', order: 3, id: '95ee68ee-1afa-4c5a-8a8f-53f6dc0d8163' },
    { name: 'Stoichiometry', slug: 'g11-stoichiometry', order: 4, id: '70289ae9-7a8b-4ad3-bf76-b318d99abe00' },
    { name: 'States and Phases of Matter', slug: 'g11-states-and-phases-of-matter', order: 5, id: '7707be4f-ea1e-45bf-b5d8-a3396d21c0c4' },
    { name: 'Chemical Energetics', slug: 'g11-chemical-energetics', order: 6, id: '851d12ee-8f4c-408e-878e-73d8c939b860' },
    { name: 'Reaction Kinetics', slug: 'g11-reaction-kinetics', order: 7, id: '427644c7-b493-405c-bd84-604faca3bbdc' },
    { name: 'Chemical Equilibrium', slug: 'g11-chemical-equilibrium', order: 8, id: '8678597f-cd43-4479-b651-546fcca51112' },
    { name: 'Acid-Base Chemistry', slug: 'g11-acid-base-chemistry', order: 9, id: 'f7a0e5ff-f257-465c-9629-0b0a6fd9077c' },
    { name: 'Electrochemistry', slug: 'g11-electrochemistry', order: 10, id: '4a0efc46-e224-4a6a-9757-9244603dbfed' },
    { name: 'Hydrocarbons', slug: 'g11-hydrocarbons', order: 11, id: '14f6bbc5-dd36-42f3-9894-b3e10a948174' },
    { name: 'Nitrogen and Sulfur', slug: 'g11-nitrogen-and-sulfur', order: 12, id: 'e2f3938d-9b7d-45dc-b928-ca59e8ed490a' },
    { name: 'Halogens', slug: 'g11-halogens', order: 13, id: '241c326a-e4bb-47a5-a3fd-18c93c312dfc' },
    { name: 'Atmosphere', slug: 'g11-atmosphere', order: 14, id: 'df86f8d0-52bd-4864-8cf1-658fd4a7deec' },
    { name: 'Basic Separation Techniques', slug: 'g11-basic-separation-techniques', order: 15, id: '2c7f18e6-afd7-4a54-b652-caea3f8997b4' },
    { name: 'Lab Safety and Practical Skills', slug: 'g11-lab-safety-and-practical-skills', order: 16, id: '1fa8fc00-66db-442b-9203-7b3dd1d6a66d' },
  ],
  physics: [
    { name: 'Measurements', slug: 'g11-measurements', order: 1, id: 'd2202617-7e03-472c-8d2a-099437b89c72' },
    { name: 'Force and Motion', slug: 'g11-force-and-motion', order: 2, id: '4ea65e9d-15e9-4ac1-a27b-82e8e094570a' },
    { name: 'Circular and Rotational Motion', slug: 'g11-circular-and-rotational-motion', order: 3, id: 'ea6160b3-4fb4-435d-88b0-c915393138e1' },
    { name: 'Work, Energy and Power', slug: 'g11-work-energy-and-power', order: 4, id: '3fbb7143-296f-4997-a5fe-e0137aa85c58' },
    { name: 'Solids and Fluid Dynamics', slug: 'g11-solids-and-fluid-dynamics', order: 5, id: 'dca2764f-cf80-4a92-bfde-1b7fe2b7f715' },
    { name: 'Heat and Thermodynamics', slug: 'g11-heat-and-thermodynamics', order: 6, id: 'b32f4948-b447-40f4-98d2-50d10e61bf07' },
    { name: 'Waves and Vibrations', slug: 'g11-waves-and-vibrations', order: 7, id: '73104497-6580-4ce5-b22f-604eb9e0e8a4' },
    { name: 'Physical Optics and Gravitational Waves', slug: 'g11-physical-optics-and-gravitational-waves', order: 8, id: 'b6eef43a-cb55-492e-a057-8595fd4ad93f' },
    { name: 'Electrostatics and Current Electricity', slug: 'g11-electrostatics-and-current-electricity', order: 9, id: 'cdea1cad-124d-4c16-aa6b-e9aad2634ae9' },
    { name: 'Electromagnetism', slug: 'g11-electromagnetism', order: 10, id: '8cdd9fe5-e4f2-4fc5-905a-e368534527a4' },
    { name: 'Special Theory of Relativity', slug: 'g11-special-theory-of-relativity', order: 11, id: 'a88f47c1-f8cb-4ed8-9d0f-fd267e03eb1a' },
    { name: 'Nuclear and Particle Physics', slug: 'g11-nuclear-and-particle-physics', order: 12, id: '3863d8c6-c429-4979-93d9-c8e371e7a960' },
  ],
  'computer-science': [
    { name: 'Introduction to Software Development', slug: 'g11-introduction-to-software-development', order: 1, id: '0099d677-fe88-4844-b2c7-50bed8ae7473' },
    { name: 'Python Programming', slug: 'g11-python-programming', order: 2, id: '66cc0394-c7f0-4b65-9612-29915c53b538' },
    { name: 'Algorithms and Problem Solving', slug: 'g11-algorithms-and-problem-solving', order: 3, id: '8a1d285e-a9c8-4fb5-aa63-4b8a8bdc439a' },
    { name: 'Computational Structures', slug: 'g11-computational-structures', order: 4, id: 'ac7d4473-6f35-42f9-811c-bc2d3efc9a68' },
    { name: 'Data Analytics', slug: 'g11-data-analytics', order: 5, id: 'b0c21b5d-71cf-443d-a1e9-589b57583bf0' },
    { name: 'Emerging Technologies', slug: 'g11-emerging-technologies', order: 6, id: 'c5132713-bba2-45db-8079-86cc7ddd6270' },
    { name: 'Legal and Ethical Aspects of Computing System', slug: 'g11-legal-and-ethical-aspects-of-computing-system', order: 7, id: '1aa686d7-d02b-414f-8acb-ddcbbd7ca4df' },
    { name: 'Online Research and Digital Literacy', slug: 'g11-online-research-and-digital-literacy', order: 8, id: '9fefe34e-c823-4361-a4f0-19026231800d' },
    { name: 'Entrepreneurship in Digital Age', slug: 'g11-entrepreneurship-in-digital-age', order: 9, id: '693994ce-eccc-4444-890d-0ffc0d3c8cb4' },
  ],
  mathematics: [
    { name: 'Complex Numbers', slug: 'g11-complex-numbers', order: 1, id: '010702f7-50ea-46e5-b836-87ba86a02172' },
    { name: 'Functions and Graphs', slug: 'g11-functions-and-graphs', order: 2, id: '89b9f30c-3ea2-4ebf-bf72-d7dde66fca04' },
    { name: 'Theory of Quadratic Equations', slug: 'g11-theory-of-quadratic-equations', order: 3, id: 'dfcd9c97-9136-47bb-ba8c-f632a669e90e' },
    { name: 'Matrices and Determinants', slug: 'g11-matrices-and-determinants', order: 4, id: 'bd700335-a2a0-422a-8245-46be3e7f6641' },
    { name: 'Partial Fractions', slug: 'g11-partial-fractions', order: 5, id: '32c1e854-f3ff-435b-9f93-32547a3f2b0b' },
    { name: 'Sequences and Series', slug: 'g11-sequences-and-series', order: 6, id: '07240707-01d9-4e1c-80ae-08d92429bb35' },
    { name: 'Permutations and Combinations', slug: 'g11-permutations-and-combinations', order: 7, id: '5ca06dd1-f7cf-48a2-abe8-4efc490172e3' },
    { name: 'Mathematical Inductions and Binomial Theorem', slug: 'g11-mathematical-inductions-and-binomial-theorem', order: 8, id: 'bfc66ec7-0b7f-49e6-9496-71f28d3a6b34' },
    { name: 'Division of Polynomials', slug: 'g11-division-of-polynomials', order: 9, id: '4c438bc4-0720-45a4-9497-8b9ebfc33247' },
    { name: 'Trigonometric Identities', slug: 'g11-trigonometric-identities', order: 10, id: '9940b6a4-3712-40af-b57f-ab08ef416ebf' },
    { name: 'Trigonometric Functions and their Graphs', slug: 'g11-trigonometric-functions-and-their-graphs', order: 11, id: '02747593-52a2-49f9-a37b-4179bdd06f12' },
    { name: 'Limit and Continuity', slug: 'g11-limit-and-continuity', order: 12, id: '47622e29-44ff-4012-b07b-f205523aca94' },
    { name: 'Differentiation', slug: 'g11-differentiation', order: 13, id: '34856432-2933-479a-8411-ce8bb9e1101e' },
    { name: 'Vectors in Space', slug: 'g11-vectors-in-space', order: 14, id: 'e3d1d767-2b8d-4606-bbba-65b4e23a21d6' },
  ],
  english: [
    { name: 'Khatam-un-Nabiyeen Hazrat Muhammad (PBUH)', slug: 'g11-khatam-un-nabiyeen-hazrat-muhammad-pbuh', order: 1, id: 'cdf24b40-6010-4167-8546-3b981d5c0140' },
    { name: 'Responsibility of the Youth in Nation-Building', slug: 'g11-responsibility-of-the-youth-in-nation-building', order: 2, id: 'f0f40155-e9ee-4a12-b085-64394898f31d' },
    { name: 'A Bird, Came Down the Walk', slug: 'g11-a-bird-came-down-the-walk', order: 3, id: 'd33d4695-f17f-4b8b-91a4-1d00c2474831' },
    { name: 'Team Moon', slug: 'g11-team-moon', order: 4, id: 'f99ac1f6-845a-4851-b471-8c27577b5be3' },
    { name: 'Impact of Global Warming on Pakistan', slug: 'g11-impact-of-global-warming-on-pakistan', order: 5, id: 'eab041f7-3ca7-4eeb-85bc-728aa6af4c66' },
    { name: 'The Echoing Green', slug: 'g11-the-echoing-green', order: 6, id: '00aeaf1c-dbf0-40a7-b4a1-e402a4f896a9' },
    { name: 'What You do is What You are', slug: 'g11-what-you-do-is-what-you-are', order: 7, id: '58913d1c-b65b-4a34-aa6f-1deca4d4de86' },
    { name: 'Clean Water', slug: 'g11-clean-water', order: 8, id: '2347b155-9ccc-4800-a1b4-c171698f0572' },
    { name: 'Freedom', slug: 'g11-freedom', order: 9, id: '3dc7bb1a-f018-4acf-ac5f-c9fe74c9ab20' },
    { name: 'The Punishment of Shahpesh, Persian, on Khipil, the Builder', slug: 'g11-the-punishment-of-shahpesh-persian-on-khipil-the-builder', order: 10, id: '6ebdd57e-011a-4dc2-b28f-66993cf639ee' },
    { name: 'Those Winter Sundays', slug: 'g11-those-winter-sundays', order: 11, id: '9aec78d6-7288-4afc-8d6e-c550ae446dd6' },
    { name: 'The Impact of AI on Society, Human Relationships, and Ethics', slug: 'g11-the-impact-of-ai-on-society-human-relationships-and-ethics', order: 12, id: '1012d67d-f531-494e-9834-fc92f85dabfc' },
    { name: "Ruba'iyat", slug: 'g11-rubaiyat', order: 13, id: '7b0ead09-0a3b-472a-aa68-aecdc93e61ca' },
    { name: 'The End of the Beginning', slug: 'g11-the-end-of-the-beginning', order: 14, id: '7d48dc8f-c5ca-4019-93fe-84b431cd07cc' },
  ],
  'tarjuma-tul-quran': [
    { name: 'Surah Al-Baqarah', slug: 'g11-surah-al-baqarah', order: 1, id: '295bf508-1073-432f-b6be-ded78e192800' },
    { name: 'Surah Aal-e-Imran', slug: 'g11-surah-aal-e-imran', order: 2, id: '79d5a75b-c12d-4a3e-a55f-9aadbf359e04' },
    { name: 'Surah Al-Anfal', slug: 'g11-surah-al-anfal', order: 3, id: 'f679cee7-3138-410a-853a-33002bc4abf3' },
    { name: 'Surah At-Taubah', slug: 'g11-surah-at-taubah', order: 4, id: 'f307cb22-4c8b-47b1-b437-6eae3a6f9e2f' },
  ],
  urdu: [
    { name: 'Hamd', slug: 'g11-hamd', order: 1, id: '49439f37-5674-4e67-a944-7f1697d3d250' },
    { name: 'Naat', slug: 'g11-naat', order: 2, id: '3bd47830-5de8-4195-bd9d-1f0f48c0a227' },
    { name: 'Akhlaq-e-Nabvi SAW', slug: 'g11-akhlaq-e-nabvi-saw', order: 3, id: 'f36a0832-b87b-4dba-bfa2-56db28418349' },
    { name: 'Faqa ma Roza', slug: 'g11-faqa-ma-roza', order: 4, id: '54988f57-23eb-4f63-b85f-3cf3c44f2aee' },
    { name: 'Makateeb e Ghalib', slug: 'g11-makateeb-e-ghalib', order: 5, id: '5c81fa1e-4b5f-4e1c-b811-cb9a7db9ea76' },
    { name: 'Aik Ustad Adalat Mein', slug: 'g11-aik-ustad-adalat-mein', order: 6, id: '59a73ef7-5076-470d-a3a0-65e15f93e845' },
    { name: 'Charpai', slug: 'g11-charpai', order: 7, id: '8a71f2ef-e11c-4baf-8141-f01c1f528bc4' },
    { name: 'Aur Pakistan bn Gya', slug: 'g11-aur-pakistan-bn-gya', order: 8, id: '2bf43e7f-c117-4e97-b490-6b30345e4a2d' },
    { name: 'Naya Qanoon', slug: 'g11-naya-qanoon', order: 9, id: '79ed6d4b-1dd0-4c7a-9184-9a3f045e3cef' },
    { name: 'Dehleez', slug: 'g11-dehleez', order: 10, id: '0f1cd333-2d77-476f-ae31-3cdd2f4601b0' },
    { name: 'Tareekh ka Kafan', slug: 'g11-tareekh-ka-kafan', order: 11, id: 'ba300f30-9d6e-40aa-8a00-409078f5695e' },
    { name: 'Pakistani Zubane aur un ka bahmi rishta', slug: 'g11-pakistani-zubane-aur-un-ka-bahmi-rishta', order: 12, id: '8ffc879c-0216-4746-b35a-04011451003d' },
    { name: 'Ay Wadi e Lolaab', slug: 'g11-ay-wadi-e-lolaab', order: 13, id: 'caac54ec-9a8e-4921-b80f-f593c44bbd80' },
    { name: 'O Des Se Aane Wale Bata', slug: 'g11-o-des-se-aane-wale-bata', order: 14, id: '0753cdfe-6410-4063-9fe4-317d6ccb0943' },
    { name: 'Azadi', slug: 'g11-azadi', order: 15, id: 'a4d1d1c5-713c-4fd1-b402-87bd4b70d593' },
    { name: 'Ikhlas', slug: 'g11-ikhlas', order: 16, id: 'f0176d13-659e-4905-8db8-9d3b1b032607' },
    { name: 'Khara Dinner', slug: 'g11-khara-dinner', order: 17, id: 'a8d9b8b9-f4a4-4578-ad5f-635b0d58c85e' },
    { name: 'Patta Patta Buta Buta Hal Hamara Jaane Hai', slug: 'g11-patta-patta-buta-buta-hal-hamara-jaane-hai', order: 18, id: '7caa8b82-7a35-47dd-aeb2-6c195c937a01' },
    { name: 'Sar Mein Sauda Bhi Nahi Dil Mein Tamana Bhi Nahi', slug: 'g11-sar-mein-sauda-bhi-nahi-dil-mein-tamana-bhi-nahi', order: 19, id: 'a8c44f13-b90e-4105-ad75-c39d62616be6' },
    { name: 'Bechain Bohat Phirna Ghabraye Hue Rahna', slug: 'g11-bechain-bohat-phirna-ghabraye-hue-rahna', order: 20, id: 'f7572f79-3905-4dfa-b55b-75c1f90152a7' },
    { name: 'Silsaly tor Gaya wo Sabhi jataty jataty', slug: 'g11-silsaly-tor-gaya-wo-sabhi-jataty-jataty', order: 21, id: '6baddff7-b549-492e-bc59-91529c777e39' },
    { name: 'Badban Khulne Se Pehle ka Ishara', slug: 'g11-badban-khulne-se-pehle-ka-ishara', order: 22, id: 'dcc69c9f-6be1-4153-a22e-db1cee28f3e6' },
  ],
};

const SUBJECT_NAMES: Record<string, string> = {
  chemistry: 'Chemistry',
  physics: 'Physics',
  'computer-science': 'Computer Science',
  mathematics: 'Mathematics',
  english: 'English',
  'tarjuma-tul-quran': 'Tarjuma Tul Quran',
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
    book_title: `Class 11 ${SUBJECT_NAMES[p.subjectSlug]} Notes (Punjab)`,
    light_key: lightExists ? `${keyBase}.light.pdf` : darkExists ? `${keyBase}.dark.pdf` : null,
    dark_key: darkExists ? `${keyBase}.dark.pdf` : lightExists ? `${keyBase}.light.pdf` : null,
    context_key: txtExists ? `${keyBase}.context.txt` : null,
    source: { dark: darkExists ? p.darkAbs : undefined, light: lightExists ? p.lightAbs : undefined, txt: txtExists ? p.txtAbs : undefined },
  });
}

// --- Chemistry / Physics: dark/light/txt first, then "Chapter N - Name" folder, flat files.
// Physics additionally has a base "Physics_ChN_..._Dark.pdf" reading/notes file (not always present).
function discoverChapterModeFirst(subjectSlug: 'chemistry' | 'physics', folderName: string) {
  const rows: Row[] = [];
  const darkBase = path.join(ROOT, folderName, 'dark');
  if (!existsSync(darkBase)) return rows;
  const chapterFolders = readdirSync(darkBase, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
  for (const chapter of CHAPTERS[subjectSlug]!) {
    const folder = chapterFolders.find((name) => extractOrderNumber(name) === chapter.order);
    if (!folder) continue;
    const darkFiles = readdirSync(path.join(darkBase, folder));
    const sections: [string, Row['content_section'], string][] = [
      ['MCQ', 'mcq', 'MCQs'],
      ['ShortQ', 'short', 'Short Questions'],
      ['LongQ', 'long', 'Long Questions'],
    ];
    for (const [token, section, label] of sections) {
      const darkFile = darkFiles.find((f) => f.includes(token) && /Dark\.pdf$/i.test(f));
      if (!darkFile) continue;
      const lightFile = darkFile.replace(/Dark\.pdf$/i, 'Light.pdf');
      const txtDir = path.join(ROOT, folderName, 'txt', folder);
      const txtFile = findTxtInDir(txtDir, darkFile);
      pushRow(rows, {
        subjectSlug, chapterSlug: chapter.slug, chapterId: chapter.id, contentSection: section,
        title: `${SUBJECT_NAMES[subjectSlug]} — Chapter ${chapter.order}: ${chapter.name} — ${label}`,
        darkAbs: path.join(darkBase, folder, darkFile),
        lightAbs: path.join(ROOT, folderName, 'light', folder, lightFile),
        txtAbs: txtFile ? path.join(txtDir, txtFile) : undefined,
        titleSlug: `${slugify(chapter.name)}-${section === 'mcq' ? 'mcqs' : section === 'short' ? 'short-questions' : 'long-questions'}`,
      });
    }
    // Physics-only: base chapter notes file, e.g. "Physics_Ch1_Measurements_Dark.pdf" / "Ch10_Electromagnetism_Dark.pdf"
    if (subjectSlug === 'physics') {
      const baseFile = darkFiles.find((f) => /Dark\.pdf$/i.test(f) && !/MCQs|ShortQ|LongQ/i.test(f));
      if (baseFile) {
        const lightFile = baseFile.replace(/Dark\.pdf$/i, 'Light.pdf');
        const txtDir = path.join(ROOT, folderName, 'txt', folder);
        const txtFile = findTxtInDir(txtDir, baseFile);
        pushRow(rows, {
          subjectSlug, chapterSlug: chapter.slug, chapterId: chapter.id, contentSection: 'reading',
          title: `Physics — Chapter ${chapter.order}: ${chapter.name} — Notes`,
          darkAbs: path.join(darkBase, folder, baseFile),
          lightAbs: path.join(ROOT, folderName, 'light', folder, lightFile),
          txtAbs: path.join(ROOT, folderName, 'txt', folder, txtFile),
          titleSlug: `${slugify(chapter.name)}-notes`,
        });
      }
    }
  }
  return rows;
}

// --- Computer Science: chapter folder holds MCQs/ShortQ/LongQ + Exercise|SolvedExercise ---
function discoverComputerScience11() {
  const rows: Row[] = [];
  const subjectSlug = 'computer-science';
  const darkBase = path.join(ROOT, 'com', 'dark');
  if (!existsSync(darkBase)) return rows;
  const chapterFolders = readdirSync(darkBase, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
  for (const chapter of CHAPTERS['computer-science']!) {
    const folder = chapterFolders.find((name) => extractOrderNumber(name) === chapter.order);
    if (!folder) continue;
    const darkFiles = readdirSync(path.join(darkBase, folder));
    const sections: { tokens: string[]; section: Row['content_section']; label: string; tag: string }[] = [
      ['MCQs'], ['ShortQ'], ['LongQ'], ['Exercise'],
    ].map(([t], i) => [
      { tokens: ['MCQs'], section: 'mcq' as const, label: 'MCQs', tag: 'mcqs' },
      { tokens: ['ShortQ'], section: 'short' as const, label: 'Short Questions', tag: 'short-questions' },
      { tokens: ['LongQ'], section: 'long' as const, label: 'Long Questions', tag: 'long-questions' },
      { tokens: ['Exercise'], section: 'reading' as const, label: 'Exercise', tag: 'exercise' },
    ][i]!);
    for (const { tokens, section, label, tag } of sections) {
      const darkFile = darkFiles.find((f) => tokens.some((t) => f.includes(t)) && /Dark\.pdf$/i.test(f));
      if (!darkFile) continue;
      const lightFile = darkFile.replace(/Dark\.pdf$/i, 'Light.pdf');
      const txtDirCom = path.join(ROOT, 'com', 'txt', folder);
      const txtFile = findTxtInDir(txtDirCom, darkFile);
      pushRow(rows, {
        subjectSlug, chapterSlug: chapter.slug, chapterId: chapter.id, contentSection: section,
        title: `Computer Science — Chapter ${chapter.order}: ${chapter.name} — ${label}`,
        darkAbs: path.join(darkBase, folder, darkFile),
        lightAbs: path.join(ROOT, 'com', 'light', folder, lightFile),
        txtAbs: txtFile ? path.join(txtDirCom, txtFile) : undefined,
        titleSlug: `${slugify(chapter.name)}-${tag}`,
      });
    }
  }
  return rows;
}

// --- Mathematics: dark/light/txt first, then mcqus/ + notes/, then "Unit N – Name" folder, per-exercise files ---
function extractMathExerciseKey(filename: string): string | null {
  const numMatch = filename.match(/(\d+\.\d+)/);
  if (numMatch) return numMatch[1]!;
  return null;
}

function discoverMath11() {
  const rows: Row[] = [];
  const subjectSlug = 'mathematics';
  const notesDarkBase = path.join(ROOT, 'Math', 'dark', 'notes');
  if (!existsSync(notesDarkBase)) return rows;
  const unitFolders = readdirSync(notesDarkBase, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
  for (const chapter of CHAPTERS.mathematics!) {
    const folder = unitFolders.find((name) => extractOrderNumber(name) === chapter.order);
    if (!folder) continue;
    for (const [sub, isMcq] of [['notes', false], ['mcqus', true]] as const) {
      const darkDir = path.join(ROOT, 'Math', 'dark', sub, folder);
      if (!existsSync(darkDir)) continue;
      const darkFiles = readdirSync(darkDir);
      const lightDir = path.join(ROOT, 'Math', 'light', sub, folder);
      const lightFiles = existsSync(lightDir) ? readdirSync(lightDir) : [];
      const txtDir = path.join(ROOT, 'Math', 'txt', sub, folder);
      const txtFiles = existsSync(txtDir) ? readdirSync(txtDir) : [];
      const seen = new Set<string>();
      for (const darkFile of darkFiles) {
        const key = extractMathExerciseKey(darkFile);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        const lightFile = lightFiles.find((f) => extractMathExerciseKey(f) === key);
        const txtFile = txtFiles.find((f) => extractMathExerciseKey(f) === key);
        const label = isMcq ? `Exercise ${key} — MCQs` : `Exercise ${key} (Solved)`;
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
  }
  return rows;
}

// --- English: flat, single file per chapter (no dark/light theme split) ---
function discoverEnglish11() {
  const rows: Row[] = [];
  const subjectSlug = 'english';
  const dir = path.join(ROOT, 'eng', 'chapters');
  if (!existsSync(dir)) return rows;
  const files = readdirSync(dir).filter((f) => /\.pdf$/i.test(f));
  for (const chapter of CHAPTERS.english!) {
    const file = files.find((f) => {
      const m = f.match(/Ch(\d+)\s+Notes/i);
      return Boolean(m && Number(m[1]) === chapter.order);
    });
    if (!file) continue;
    pushRow(rows, {
      subjectSlug, chapterSlug: chapter.slug, chapterId: chapter.id, contentSection: 'reading',
      title: `English — Chapter ${chapter.order}: ${chapter.name} — Notes`,
      darkAbs: path.join(dir, file),
      lightAbs: path.join(dir, file),
      titleSlug: `${slugify(chapter.name)}-notes`,
    });
  }
  return rows;
}

// --- Tarjuma Tul Quran: flat files, Ch1_AlBaqarah_*, Ch2_AaleImran_*, ch3_*, ch4_* (Longs/MCQs/Shorts) ---
const TQ11_TOKEN_BY_ORDER: Record<number, RegExp> = {
  1: /^Ch1_AlBaqarah/i,
  2: /^Ch2_AaleImran/i,
  3: /^ch3_/i,
  4: /^ch4_/i,
};

function discoverTQ11() {
  const rows: Row[] = [];
  const subjectSlug = 'tarjuma-tul-quran';
  const dir = path.join(ROOT, 'T_Q');
  if (!existsSync(dir)) return rows;
  const files = readdirSync(dir);
  for (const chapter of CHAPTERS['tarjuma-tul-quran']!) {
    const re = TQ11_TOKEN_BY_ORDER[chapter.order]!;
    const sections: [RegExp, Row['content_section'], string, string][] = [
      [/mcqs/i, 'mcq', 'MCQs', 'mcqs'],
      [/shorts/i, 'short', 'Short Questions', 'short-questions'],
      [/longs/i, 'long', 'Long Questions', 'long-questions'],
    ];
    for (const [token, section, label, tag] of sections) {
      const darkFile = files.find((f) => re.test(f) && token.test(f) && /Dark\.pdf$/i.test(f));
      if (!darkFile) continue;
      const lightFile = darkFile.replace(/Dark\.pdf$/i, 'Light.pdf');
      const txtFile = darkFile.replace(/_Dark\.pdf$/i, '.txt');
      pushRow(rows, {
        subjectSlug, chapterSlug: chapter.slug, chapterId: chapter.id, contentSection: section,
        title: `Tarjuma Tul Quran — ${chapter.name} — ${label}`,
        darkAbs: path.join(dir, darkFile),
        lightAbs: path.join(dir, lightFile),
        txtAbs: path.join(dir, txtFile),
        titleSlug: `${slugify(chapter.name)}-${tag}`,
      });
    }
  }
  return rows;
}

// --- Urdu: poems (nazam/ + ghazal/) numbered by chapter order; prose (chapters/dark|light|txt)
// numbered by chapter order; plus chapterless general essay/letter-writing skill files. ---
function discoverUrdu11() {
  const rows: Row[] = [];
  const subjectSlug = 'urdu';

  // Poems: nazam/ + ghazal/ subfolders, files prefixed "<order>_..." or "0<order>_..."
  for (const poemDir of ['nazam', 'ghazal']) {
    const darkDir = path.join(ROOT, 'urdu', 'dark', poemDir);
    if (!existsSync(darkDir)) continue;
    const darkFiles = readdirSync(darkDir).filter((f) => /Dark\.pdf$/i.test(f));
    for (const chapter of CHAPTERS.urdu!) {
      const prefixed = darkFiles.filter((f) => {
        const m = f.match(/^(?:ch)?0?(\d+)_/i);
        return Boolean(m && Number(m[1]) === chapter.order);
      });
      const mcqFile = prefixed.find((f) => /MCQs/i.test(f));
      const notesFile = prefixed.find((f) => /Notes/i.test(f));
      for (const [darkFile, section, label, tag] of [
        [mcqFile, 'mcq', 'MCQs', 'mcqs'],
        [notesFile, 'reading', 'Notes', 'notes'],
      ] as const) {
        if (!darkFile) continue;
        const lightFile = darkFile.replace(/Dark\.pdf$/i, 'Light.pdf');
        const txtFile = findTxtInDir(darkDir, darkFile);
        pushRow(rows, {
          subjectSlug, chapterSlug: chapter.slug, chapterId: chapter.id, contentSection: section,
          title: `Urdu — ${chapter.name} — ${label}`,
          darkAbs: path.join(darkDir, darkFile),
          lightAbs: path.join(darkDir, lightFile),
          txtAbs: txtFile ? path.join(darkDir, txtFile) : undefined,
          titleSlug: `${slugify(chapter.name)}-${tag}`,
        });
      }
    }
  }

  // Prose: urdu/dark/chapters/{dark,light,txt}/<order>_Name_(MCQs|Notes)_(Dark|Light).pdf
  const proseDarkDir = path.join(ROOT, 'urdu', 'dark', 'chapters', 'dark');
  if (existsSync(proseDarkDir)) {
    const darkFiles = readdirSync(proseDarkDir).filter((f) => /Dark\.pdf$/i.test(f));
    for (const chapter of CHAPTERS.urdu!) {
      const prefixed = darkFiles.filter((f) => {
        const m = f.match(/^(\d+)_/);
        return Boolean(m && Number(m[1]) === chapter.order);
      });
      const mcqFile = prefixed.find((f) => /MCQs/i.test(f));
      const notesFile = prefixed.find((f) => /Notes/i.test(f));
      for (const [darkFile, section, label, tag] of [
        [mcqFile, 'mcq', 'MCQs', 'mcqs'],
        [notesFile, 'reading', 'Notes', 'notes'],
      ] as const) {
        if (!darkFile) continue;
        const lightFile = darkFile.replace(/Dark\.pdf$/i, 'Light.pdf');
        const txtFile = darkFile.replace(/_Dark\.pdf$/i, '.txt');
        pushRow(rows, {
          subjectSlug, chapterSlug: chapter.slug, chapterId: chapter.id, contentSection: section,
          title: `Urdu — ${chapter.name} — ${label}`,
          darkAbs: path.join(proseDarkDir, darkFile),
          lightAbs: path.join(ROOT, 'urdu', 'dark', 'chapters', 'light', lightFile),
          txtAbs: path.join(ROOT, 'urdu', 'dark', 'chapters', 'txt', txtFile),
          titleSlug: `${slugify(chapter.name)}-${tag}`,
        });
      }
    }
  }

  // General (chapterless) essay/letter-writing skill files — flat in urdu/dark
  const genDarkDir = path.join(ROOT, 'urdu', 'dark');
  if (existsSync(genDarkDir)) {
    const genFiles = readdirSync(genDarkDir).filter((f) => /Dark\.pdf$/i.test(f) && !f.startsWith('~$'));
    const labels: Record<string, string> = {
      Ch11_Urdu_GrammarMCQs: 'Grammar MCQs',
      Ch_Mukaalma_Nigari: 'Mukaalma Nigari (Dialogue Writing)',
      Ch_Raseedaat_Darkhwast: 'Raseedaat and Darkhwast (Receipts and Applications)',
      roznaamcha: 'Roznaamcha (Diary Writing)',
      rudaad: 'Rudaad (Report Writing)',
      talkhees: 'Talkhees (Summary Writing)',
    };
    for (const darkFile of genFiles) {
      const base = darkFile.replace(/_?[Dd]ark\.pdf$/, '').replace(/_Dark\.pdf$/i, '');
      const key = Object.keys(labels).find((k) => darkFile.toLowerCase().startsWith(k.toLowerCase()));
      if (!key) continue;
      const label = labels[key]!;
      const lightFile = darkFile.replace(/[Dd]ark\.pdf$/, 'Light.pdf');
      const txtFile = darkFile.replace(/_?[Dd]ark\.pdf$/i, '.txt');
      pushRow(rows, {
        subjectSlug, chapterSlug: 'general', chapterId: null, contentSection: /grammar|mcq/i.test(label) ? 'mcq' : 'reading',
        title: `Urdu — ${label}`,
        darkAbs: path.join(genDarkDir, darkFile),
        lightAbs: path.join(genDarkDir, lightFile),
        txtAbs: path.join(ROOT, 'urdu', 'txt', txtFile),
        titleSlug: slugify(label),
      });
    }
  }

  return rows;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  const rows: Row[] = [
    ...discoverChapterModeFirst('chemistry', 'chem'),
    ...discoverChapterModeFirst('physics', 'phy'),
    ...discoverComputerScience11(),
    ...discoverMath11(),
    // English skipped for now on user's instruction — eng/chapters/ only has PDFs,
    // no companion .txt files exist locally for it (unlike every other subject),
    // and the user wants all notes resources to have their txt attached. Revisit
    // once .txt versions exist for grade 11 English.
    ...discoverTQ11(),
    ...discoverUrdu11(),
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

  const manifestPath = path.join(process.cwd(), dryRun ? '11th-library-manifest.dryrun.json' : '11th-library-manifest.json');
  writeFileSync(manifestPath, JSON.stringify(rows, null, 2));
  console.log(`Manifest written to: ${manifestPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
