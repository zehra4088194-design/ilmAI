// One-off admin script: bulk-upload E:\data\9th\notes\<subject> content into B2
// (same bucket/pattern as src/lib/presentation/backgrounds.ts's neighbor,
// library resources) and catalog it in public.library_resources, following
// the exact precedent already used for 9th-Biology (see
// E:\data\9th\notes\biology\docs\01-backblaze-upload-prompt.md).
//
// This script does NOT touch resource_mcq_sets (the exact question bank) —
// that's a separate, deliberately manual pass on claude.ai with the attached
// .txt files, per docs/02-exact-question-bank-prompt.md.
//
// Usage:
//   npx tsx --env-file=.env.local scripts/bulk-upload-9th-library-resources.ts --dry-run
//   npx tsx --env-file=.env.local scripts/bulk-upload-9th-library-resources.ts --subject=chemistry
//   npx tsx --env-file=.env.local scripts/bulk-upload-9th-library-resources.ts

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { putR2Object } from '../src/lib/storage/r2';

const ROOT = 'E:/data/9th/notes';
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

// Folder names are "1.Name", "1 - Name", or "Chapter 1 – Name" — pull the
// leading/labelled number out regardless of which format is used, instead of
// naively splitting on the first '.'/space (which broke on "Chapter 1 – ...").
function extractOrderNumber(folderName: string): number | null {
  const leading = folderName.match(/^(\d+)[.\s]/);
  if (leading) return Number(leading[1]);
  const labelled = folderName.match(/Chapter\s+(\d+)/i) || folderName.match(/Unit\s+(\d+)/i);
  if (labelled) return Number(labelled[1]);
  return null;
}

// --- Chapter IDs already seeded in Supabase (subjects + chapters, fetched live) ---
const CHAPTERS: Record<string, { name: string; slug: string; order: number; id: string }[]> = {
  chemistry: [
    { name: 'States of Matter and Phase Changes', slug: 'g9-states-of-matter-and-phase-changes', order: 1, id: '13b8c2ea-e028-43af-b14e-5222f14e3b16' },
    { name: 'Atomic Structure', slug: 'g9-atomic-structure', order: 2, id: 'b0a5a574-a99f-4833-b371-d7ee810d49c2' },
    { name: 'Chemical Bonding', slug: 'g9-chemical-bonding', order: 3, id: '1e21f347-013d-4a21-bf8c-8f2a4148a1af' },
    { name: 'Stoichiometry', slug: 'g9-stoichiometry', order: 4, id: 'bd9c9129-1afa-432c-937f-5bd229836d56' },
    { name: 'Energetics', slug: 'g9-energetics', order: 5, id: '73a72d48-d6ce-4775-8cb4-55056fa41cac' },
    { name: 'Equilibria', slug: 'g9-equilibria', order: 6, id: '553a3214-f765-4455-b1ae-1aa94654431a' },
    { name: 'Acid Base Chemistry', slug: 'g9-acid-base-chemistry', order: 7, id: '2f878c9e-6ca9-4f27-a30d-2a09fd8ed6d0' },
    { name: 'Periodic Table & Periodicity', slug: 'g9-periodic-table-periodicity', order: 8, id: 'b4971144-90fd-4d06-84c0-6761872747df' },
    { name: 'Group Properties & Elements', slug: 'g9-group-properties-elements', order: 9, id: '5b9b17f7-0f9c-4969-a082-afa0186a0b5e' },
    { name: 'Environmental Chemistry', slug: 'g9-environmental-chemistry', order: 10, id: 'bf829439-19ab-4039-a20d-2ff82c1a332a' },
    { name: 'Hydrocarbons', slug: 'g9-hydrocarbons', order: 11, id: '2f307d3a-b595-4b2f-bb99-092376a23dd8' },
    { name: 'Empirical Data Collection and Analysis', slug: 'g9-empirical-data-collection-and-analysis', order: 12, id: '4d7d8cee-d132-4adf-817e-8a2411960c3e' },
    { name: 'Laboratory and Practical Skills', slug: 'g9-laboratory-and-practical-skills', order: 13, id: 'b7becfb5-1152-403f-9cc5-6acf0902c15a' },
  ],
  'computer-science': [
    { name: 'Introduction to Systems', slug: 'g9-introduction-to-systems', order: 1, id: '9b90b68d-3443-41af-8bf4-86ecc630cf38' },
    { name: 'Number Systems', slug: 'g9-number-systems', order: 2, id: '3ac58e0c-5ac0-42ea-9213-79be9adb6a09' },
    { name: 'Digital Systems and Logic Design', slug: 'g9-digital-systems-and-logic-design', order: 3, id: '61b81d62-2cfc-4f55-9023-1286c6b37a69' },
    { name: 'Systems Troubleshooting', slug: 'g9-systems-troubleshooting', order: 4, id: '6cfb03fb-a2bd-496a-890b-6fccad716b3e' },
    { name: 'Software Systems', slug: 'g9-software-systems', order: 5, id: '38c438c9-cd8e-4f33-b8d1-d068ef4dfab3' },
    { name: 'Introduction to Computer Networks', slug: 'g9-introduction-to-computer-networks', order: 6, id: '453f93bf-d37a-409b-a66a-621a4167141b' },
    { name: 'Computational Thinking', slug: 'g9-computational-thinking', order: 7, id: 'bade8304-6b4a-430b-92c6-3041a3d55c79' },
    { name: 'Web Development with HTML, CSS and Java-Script', slug: 'g9-web-development-with-html-css-and-java-script', order: 8, id: 'ade3a391-0bad-40b6-bbda-38f4716848ab' },
    { name: 'Data Science and Data Gathering', slug: 'g9-data-science-and-data-gathering', order: 9, id: '31170527-252e-4180-bdb8-503cd8d81ff9' },
    { name: 'Emerging Technologies in Computer Science', slug: 'g9-emerging-technologies-in-computer-science', order: 10, id: '4efc54a8-bfdd-4020-86cd-25f7c56f9e16' },
    { name: 'Ethical, Social and Legal Concerns in Computer Usage', slug: 'g9-ethical-social-and-legal-concerns-in-computer-usage', order: 11, id: 'c5256752-8a44-4418-b400-52022ea6755f' },
    { name: 'Entrepreneurship in Digital Age', slug: 'g9-entrepreneurship-in-digital-age', order: 12, id: '52f158f5-4bc3-4ef2-90ee-4d3fed2c2090' },
  ],
  physics: [
    { name: 'Physical Quantities & Measurement', slug: 'g9-physical-quantities-measurement', order: 1, id: '4c4b6281-fc9c-4376-b7d4-563fe298c647' },
    { name: 'Kinematics', slug: 'g9-kinematics', order: 2, id: '5a15366b-1efe-474b-8f21-9809f68e1423' },
    { name: 'Dynamics', slug: 'g9-dynamics', order: 3, id: '2a04008e-2c78-44fd-83af-ced8f61fb9fe' },
    { name: 'Turning Effect of Force', slug: 'g9-turning-effect-of-force', order: 4, id: '26719fa6-b826-47b9-92dc-32a3d34777aa' },
    { name: 'Work, Energy and Power', slug: 'g9-work-energy-and-power', order: 5, id: '13c2f525-9ff2-45c7-a2ee-c549edf094a8' },
    { name: 'Mechanical Properties of Matter', slug: 'g9-mechanical-properties-of-matter', order: 6, id: '0bc980cb-3d67-4998-a745-dddbd83fdda5' },
    { name: 'Thermal Properties of Matter', slug: 'g9-thermal-properties-of-matter', order: 7, id: '02dafa6f-bec0-426f-b597-95a6a34cafd6' },
    { name: 'Magnetism', slug: 'g9-magnetism', order: 8, id: '3eb032f5-0528-45e1-9d24-c48b9916d9a2' },
    { name: 'Nature of Science', slug: 'g9-nature-of-science', order: 9, id: '521cb91b-4f85-497c-adc0-4029b8d59697' },
  ],
  english: [
    { name: 'The Saviour of Mankind', slug: 'g9-the-saviour-of-mankind', order: 1, id: 'ba934df0-a63b-4544-b0e1-5789ab1de625' },
    { name: 'Patriotism', slug: 'g9-patriotism', order: 2, id: '09638a7a-d7f2-4891-95a3-6afac6875fdd' },
    { name: 'Daffodils', slug: 'g9-daffodils', order: 3, id: 'e43a0bfa-77e1-450e-9a48-8e7c8e6de2c5' },
    { name: 'Hazrat Asma', slug: 'g9-hazrat-asma', order: 4, id: '4c88156d-992f-4f87-99d1-4fb2e7e12160' },
    { name: 'Women Empowerment through Entrepreneurship', slug: 'g9-women-empowerment-through-entrepreneurship', order: 5, id: '2ae07b7f-63ed-410c-8843-6e17f0602bd9' },
    { name: 'The Value of Time', slug: 'g9-the-value-of-time', order: 6, id: '59b14afc-e493-4e0f-a68c-f3ae2fafda6d' },
    { name: 'If', slug: 'g9-if', order: 7, id: '370e3ba1-e475-430d-a27b-a62d79d9abd3' },
    { name: 'The Impact of Globalisation on Culture and Economy', slug: 'g9-the-impact-of-globalisation-on-culture-and-economy', order: 8, id: '2b6b5173-c031-4290-b2ed-58d1001d48ee' },
    { name: 'Quality Education: A Key to Success', slug: 'g9-quality-education-a-key-to-success', order: 9, id: '1245f748-c325-4135-af81-2ec481fbb6b6' },
    { name: 'The Silent Predator and the Majestic Prey – Snow Leopard and Markhor', slug: 'g9-the-silent-predator-and-the-majestic-prey-snow-leopard-and-markhor', order: 10, id: 'fbcb890b-a253-4ebb-b798-f13593214ee1' },
    { name: 'The Dear Departed', slug: 'g9-the-dear-departed', order: 11, id: '005b1d8d-1d1f-4ff5-b427-983ff39df271' },
  ],
  urdu: [
    { name: 'Nazam Hamad', slug: 'g9-nazam-hamad', order: 1, id: '6cac4540-e848-4985-93f4-c6c1620d22e3' },
    { name: 'Nazam Naat', slug: 'g9-nazam-naat', order: 2, id: 'aeb98d51-6108-41c3-b4a8-c4d4456947e2' },
    { name: 'Akhlaq e Hasna', slug: 'g9-akhlaq-e-hasna', order: 3, id: '51f70767-f384-44e3-a117-b40eb6577c76' },
    { name: 'Apni Madad Aap', slug: 'g9-apni-madad-aap', order: 4, id: '31283998-b92d-4ad1-a0cb-28003f4cc69a' },
    { name: 'Kaleem aur Mirza Zahir Dar Baig', slug: 'g9-kaleem-aur-mirza-zahir-dar-baig', order: 5, id: '4e146192-af07-4127-8a2e-dbbd7ba3cf74' },
    { name: 'Naam Dev Maali', slug: 'g9-naam-dev-maali', order: 6, id: '87068c45-ed0e-4627-94de-35912632302f' },
    { name: 'Araam o Sukoon', slug: 'g9-araam-o-sukoon', order: 7, id: 'eaacff16-f176-4558-a394-fdaa6f6c068b' },
    { name: 'Katba', slug: 'g9-katba', order: 8, id: '6cc44f92-f467-4697-a89d-face119a9f32' },
    { name: 'Ibtidai Hisab', slug: 'g9-ibtidai-hisab', order: 9, id: '41585759-9eee-4cf4-af2a-f824ec4fbec4' },
    { name: 'Lari Main Paroye Huvay Manazr', slug: 'g9-lari-main-paroye-huvay-manazr', order: 10, id: '6a97f1ca-7aae-4535-b35d-248e51b872ae' },
    { name: 'Bhairiya', slug: 'g9-bhairiya', order: 11, id: '3c862356-9bb4-472f-9190-b8f2f7cef3d2' },
    { name: 'Nazam Mehnat Ki Barkaat', slug: 'g9-nazam-mehnat-ki-barkaat', order: 12, id: 'c8b9a776-74f8-4ab4-8f37-aa957732b18d' },
    { name: 'Nazam Javed Ke Naam', slug: 'g9-nazam-javed-ke-naam', order: 13, id: '748cd4a7-2fc2-4700-9c27-7313a9bfe66f' },
    { name: 'Nazam Payam e Latif', slug: 'g9-nazam-payam-e-latif', order: 14, id: 'ec8c2a15-bf3b-4a83-8d23-e51a0233872c' },
    { name: 'Nazam Cricket Aur Mushaira', slug: 'g9-nazam-cricket-aur-mushaira', order: 15, id: '885173e1-3ecb-4d76-99c9-0db07896b896' },
    { name: 'Ghazal Faqirana Aae Sada Kar Chale', slug: 'g9-ghazal-faqirana-aae-sada-kar-chale', order: 16, id: '78e7b720-844f-47e6-a679-09f3235ea6fb' },
    { name: 'Ghazal Sun To Sahi Jahaan Mein Hai Tera Fasana', slug: 'g9-ghazal-sun-to-sahi-jahaan-mein-hai-tera-fasana', order: 17, id: '92ef900b-5285-4be1-9328-7f616870bb10' },
    { name: 'Ghazal Gham Hai Ya Khushi Hai Tu', slug: 'g9-ghazal-gham-hai-ya-khushi-hai-tu', order: 18, id: '07c49e51-fba4-43b7-9a4b-8f0b97038a02' },
    { name: 'Ghazal Kash Taufaan Mein Safeene Ko Utara Hota', slug: 'g9-ghazal-kash-taufaan-mein-safeene-ko-utara-hota', order: 19, id: 'ba5fe4f4-6cde-4c3c-af35-7828e7382862' },
    { name: 'Hosla Na Haro Aage Barho', slug: 'g9-hosla-na-haro-aage-barho', order: 20, id: '9d9af51c-a0be-46f3-b662-3c40edb6dd6a' },
    { name: 'Shuhdaye Pishawar Ke Liye Ek Nazam', slug: 'g9-shuhdaye-pishawar-ke-liye-ek-nazam', order: 21, id: '5be4ccc5-f9f9-4bf4-8a3f-2585ec19b4cb' },
  ],
  mathematics: [
    { name: 'Real Numbers', slug: 'g9-real-numbers', order: 1, id: '7d3e3337-4068-4541-89c6-205f88a89773' },
    { name: 'Logarithms', slug: 'g9-logarithms', order: 2, id: '375b113a-a74a-443d-8429-2484fac96e0d' },
    { name: 'Set and Functions', slug: 'g9-set-and-functions', order: 3, id: '450ab00c-15bd-4b69-9994-79df55c4cd31' },
    { name: 'Factorization and Algebraic Manipulation', slug: 'g9-factorization-and-algebraic-manipulation', order: 4, id: 'fed5ad86-65bb-4a41-8822-e399067df5f9' },
    { name: 'Linear Equations and Inequalities', slug: 'g9-linear-equations-and-inequalities', order: 5, id: '08c8d3fb-da37-4bdc-8b36-bfe9aae4cd98' },
    { name: 'Trigonometry', slug: 'g9-trigonometry', order: 6, id: '9f318d45-fc5e-46c9-843d-ac1eb10a8ccf' },
    { name: 'Coordinate Geometry', slug: 'g9-coordinate-geometry', order: 7, id: '6132ded3-48b3-495d-aa45-e399f888fa67' },
    { name: 'Logic', slug: 'g9-logic', order: 8, id: '2bcbbbbe-d218-4ea4-b4e6-7303458eedc0' },
    { name: 'Similar Figures', slug: 'g9-similar-figures', order: 9, id: 'bd01c785-ef29-4073-8699-fbc006f8fc07' },
    { name: 'Graphs of Functions', slug: 'g9-graphs-of-functions', order: 10, id: '7d09b585-274f-4f24-8ff8-0d24e37effbf' },
    { name: 'Loci and Construction', slug: 'g9-loci-and-construction', order: 11, id: 'c8b5e45f-778b-4a46-9fc7-d7ee8c53c7b0' },
    { name: 'Information Handling', slug: 'g9-information-handling', order: 12, id: '12ba2132-fb8f-4ebb-a2ee-daa5a4b82d2d' },
    { name: 'Probability', slug: 'g9-probability', order: 13, id: '0837aea7-3d5b-4a11-a8bd-df0e7b5f6bd1' },
  ],
  'tarjuma-tul-quran': [
    { name: 'Surah Maryam', slug: 'g9-surah-maryam', order: 1, id: '8ac51e06-d705-4b2f-b96d-4b5d7b448edf' },
    { name: 'Surah Taha', slug: 'g9-surah-taha', order: 2, id: '4f3e7502-8b65-42b3-8110-5d0c53991b49' },
    { name: 'Surah Al Anbiya', slug: 'g9-surah-al-anbiya', order: 3, id: '3ff677b8-8b54-4519-bb93-7ad75c78b9a8' },
    { name: 'Surah Al Hajj', slug: 'g9-surah-al-hajj', order: 4, id: '1c1284eb-932f-44c0-ba1d-987a676bf58a' },
    { name: 'Surah Al Furqan', slug: 'g9-surah-al-furqan', order: 5, id: '6615eea0-9af3-4ab0-8d03-fcf113e16f75' },
    { name: 'Surah Al Shuara', slug: 'g9-surah-al-shuara', order: 6, id: '8d6ec1c0-8cfa-4f1b-aa76-7d15694aba94' },
    { name: 'Surah An Naml', slug: 'g9-surah-an-naml', order: 7, id: '3aa014ec-7f50-429e-8d72-052d4c46cd80' },
    { name: 'Surah Al Qasas', slug: 'g9-surah-al-qasas', order: 8, id: '83ac1e11-5590-42a6-a91f-430961ba15aa' },
    { name: 'Surah Ankabut', slug: 'g9-surah-ankabut', order: 9, id: 'a333c88b-76c3-4068-9265-beb8743cacb0' },
    { name: 'Surah Rum', slug: 'g9-surah-rum', order: 10, id: '2b1a2ed9-c755-45c6-a87b-4cec4a6d7a73' },
    { name: 'Surah Luqman', slug: 'g9-surah-luqman', order: 11, id: 'ed91833b-f0a2-40a4-86d7-205897a841de' },
    { name: 'Surah Sajdah', slug: 'g9-surah-sajdah', order: 12, id: '6f6f95e6-03c3-4bc7-b700-325c264f840d' },
  ],
};

const SUBJECT_NAMES: Record<string, string> = {
  chemistry: 'Chemistry',
  'computer-science': 'Computer Science',
  physics: 'Physics',
  english: 'English',
  urdu: 'Urdu',
  mathematics: 'Mathematics',
  'tarjuma-tul-quran': 'Tarjuma Tul Quran',
};

function findChapter(subjectSlug: string, matcher: (c: { name: string; slug: string; order: number; id: string }) => boolean) {
  return CHAPTERS[subjectSlug]!.find(matcher) || null;
}

function pushRow(rows: Row[], params: {
  subjectSlug: string;
  chapterSlug: string;
  chapterId: string | null;
  contentSection: Row['content_section'];
  title: string;
  darkAbs?: string;
  lightAbs?: string;
  txtAbs?: string;
  titleSlug: string;
}) {
  const darkExists = params.darkAbs && existsSync(params.darkAbs);
  const lightExists = params.lightAbs && existsSync(params.lightAbs);
  const txtExists = params.txtAbs && existsSync(params.txtAbs);
  if (!darkExists && !lightExists) return; // nothing to upload for this resource

  const keyBase = `${KEY_PREFIX}${params.subjectSlug}/${params.chapterSlug}/${params.contentSection}/${params.titleSlug}`;
  rows.push({
    subject_slug: params.subjectSlug,
    chapter_slug: params.chapterSlug,
    chapter_id: params.chapterId,
    content_section: params.contentSection,
    title: params.title,
    book_title: `Class 9 ${SUBJECT_NAMES[params.subjectSlug]} Notes (Punjab)`,
    light_key: lightExists ? `${keyBase}.light.pdf` : darkExists ? `${keyBase}.dark.pdf` : null,
    dark_key: darkExists ? `${keyBase}.dark.pdf` : lightExists ? `${keyBase}.light.pdf` : null,
    context_key: txtExists ? `${keyBase}.context.txt` : null,
    source: {
      dark: darkExists ? params.darkAbs : undefined,
      light: lightExists ? params.lightAbs : undefined,
      txt: txtExists ? params.txtAbs : undefined,
    },
  });
}

// --- Chemistry / Computer Science: standard per-chapter dark/light/txt trio ---
function discoverStandard(subjectSlug: string, folderName: string, sectionTokens: { mcq: string[]; short: string[]; long: string[] }) {
  const rows: Row[] = [];
  const base = path.join(ROOT, folderName);
  for (const chapter of CHAPTERS[subjectSlug]!) {
    // Local folders are named "<N>.<Name>" or "Chapter <N> – <Name>" — find by order number.
    const candidates = require('node:fs').readdirSync(base, { withFileTypes: true })
      .filter((e: any) => e.isDirectory())
      .map((e: any) => e.name)
      .filter((name: string) => extractOrderNumber(name) === chapter.order);
    const folder = candidates[0];
    if (!folder) continue;
    const dir = path.join(base, folder);
    const darkFiles: string[] = require('node:fs').readdirSync(path.join(dir, 'dark'));
    for (const section of ['mcq', 'short', 'long'] as const) {
      const tokens = sectionTokens[section];
      const darkFile = darkFiles.find((f) => tokens.some((t) => f.includes(t)) && /Dark\.pdf$/i.test(f));
      if (!darkFile) continue;
      const lightFile = darkFile.replace(/Dark\.pdf$/i, 'Light.pdf');
      const txtFile = darkFile.replace(/\.pdf$/i, '.txt');
      const label = section === 'mcq' ? 'MCQs' : section === 'short' ? 'Short Questions' : 'Long Questions';
      pushRow(rows, {
        subjectSlug,
        chapterSlug: chapter.slug,
        chapterId: chapter.id,
        contentSection: section,
        title: `${SUBJECT_NAMES[subjectSlug]} — Chapter ${chapter.order}: ${titleCase(chapter.name)} — ${label}`,
        darkAbs: path.join(dir, 'dark', darkFile),
        lightAbs: path.join(dir, 'light', lightFile),
        txtAbs: path.join(dir, 'txt', txtFile),
        titleSlug: `${slugify(chapter.name)}-${section === 'mcq' ? 'mcqs' : section === 'short' ? 'short-questions' : 'long-questions'}`,
      });
    }
  }
  return rows;
}

// --- Physics: flat exercises/numericals/short+mcques/longs, filenames encode chapter number ---
function discoverPhysics() {
  const rows: Row[] = [];
  const subjectSlug = 'physics';
  const sections: { folder: string; section: Row['content_section']; label: string; titleTag: string }[] = [
    { folder: 'exercises', section: 'reading', label: 'Textbook Exercises', titleTag: 'exercises' },
    { folder: 'numericals', section: 'reading', label: 'Numericals', titleTag: 'numericals' },
    { folder: 'short+mcques', section: 'mcq', label: 'Short Questions & MCQs', titleTag: 'short-mcqs' },
    { folder: 'longs', section: 'long', label: 'Long Questions', titleTag: 'long-questions' },
  ];
  for (const { folder, section, label, titleTag } of sections) {
    const darkDir = path.join(ROOT, 'phy/dark', folder);
    if (!existsSync(darkDir)) continue;
    const darkFiles: string[] = require('node:fs').readdirSync(darkDir);
    for (const chapter of CHAPTERS.physics!) {
      const darkFile = darkFiles.find((f) => new RegExp(`(Unit|Ch)0?${chapter.order}(\\D|$)`, 'i').test(f));
      if (!darkFile) continue;
      const lightFile = darkFile.replace(/dark/i, 'light');
      const txtFile = darkFile.replace(/\.pdf$/i, '.txt').replace(/_dark|_Dark/i, '');
      pushRow(rows, {
        subjectSlug,
        chapterSlug: chapter.slug,
        chapterId: chapter.id,
        contentSection: section,
        title: `Physics — Chapter ${chapter.order}: ${titleCase(chapter.name)} — ${label}`,
        darkAbs: path.join(darkDir, darkFile),
        lightAbs: path.join(ROOT, 'phy/light', folder, lightFile),
        txtAbs: path.join(ROOT, 'phy/txt', folder, txtFile),
        titleSlug: `${slugify(chapter.name)}-${titleTag}`,
      });
    }
  }
  return rows;
}

// --- English: one file per chapter (Notes), + 4 chapter-less writing-skill resources ---
function discoverEnglish() {
  const rows: Row[] = [];
  const subjectSlug = 'english';
  const darkDir = path.join(ROOT, 'english/dark');
  const darkFiles: string[] = require('node:fs').readdirSync(darkDir);
  for (const chapter of CHAPTERS.english!) {
    const darkFile = darkFiles.find((f) => new RegExp(`(Ch|Unit)0?${chapter.order}(\\D|$)`, 'i').test(f));
    if (!darkFile) continue;
    const lightFile = darkFile.replace(/Dark\.pdf$/i, 'Light.pdf');
    const txtFile = darkFile.replace(/\.pdf$/i, '.txt');
    pushRow(rows, {
      subjectSlug,
      chapterSlug: chapter.slug,
      chapterId: chapter.id,
      contentSection: 'reading',
      title: `English — Chapter ${chapter.order}: ${titleCase(chapter.name)} — Notes`,
      darkAbs: path.join(darkDir, darkFile),
      lightAbs: path.join(ROOT, 'english/light', lightFile),
      txtAbs: path.join(ROOT, 'english/txt', txtFile),
      titleSlug: `${slugify(chapter.name)}-notes`,
    });
  }
  // Chapter-less writing-skill resources (Applications, Idioms_and_Phrases, Letters, Stories)
  for (const base of ['Applications', 'Idioms_and_Phrases', 'Letters', 'Stories']) {
    const darkFile = `${base}_Dark.pdf`;
    if (!existsSync(path.join(darkDir, darkFile))) continue;
    const label = base.replace(/_/g, ' ');
    pushRow(rows, {
      subjectSlug,
      chapterSlug: 'general',
      chapterId: null,
      contentSection: 'reading',
      title: `English — ${label} (Writing Skills)`,
      darkAbs: path.join(darkDir, darkFile),
      lightAbs: path.join(ROOT, 'english/light', `${base}_Light.pdf`),
      txtAbs: path.join(ROOT, 'english/txt', `${base}_Dark.txt`),
      titleSlug: `${slugify(label)}-writing-skills`,
    });
  }
  return rows;
}

// --- Urdu: notes/ (reading) + mcques/ (mcq) ---
// Filenames use Roman-Urdu spellings that don't always match the DB's chapter
// names exactly (e.g. file "Hamd" vs DB "Hamad", "Kutba" vs "Katba", "Bhairya"
// vs "Bhairiya") and the embedded "ChN" numbers are reused/unreliable across
// different poems — so this is hand-verified per chapter rather than fuzzy-matched.
const URDU_FILE_TOKEN_BY_ORDER: Record<number, string> = {
  1: 'Hamd',
  2: 'Naat',
  3: 'AkhlaqEHasana',
  4: 'ApniMadadAap',
  5: 'KaleemAurMirzaZahirDarbeg',
  6: 'NaamDeoMali',
  7: 'AramOSukoon',
  8: 'Kutba',
  9: 'IbtidaiHisab',
  10: 'LariMeinParoyeHuyeManzar',
  11: 'Bhairya',
  12: 'MehnatKiBarkat',
  13: 'JavedKeNaam',
  14: 'PayamELateef',
  15: 'KricketAurMushaira',
  16: 'MirTaqiMir', // "Ghazal Faqirana Aae Sada Kar Chale" is this poet's — file is named by poet, not title.
  17: 'SunTohSahi',
  18: 'GhamHaiYaKhushi',
  19: 'KaashTofaanGhazal',
  20: 'HoslaNaHaro',
  21: 'ShuhdaEPeshawar',
};

function discoverUrdu() {
  const rows: Row[] = [];
  const subjectSlug = 'urdu';
  const sections: { folder: string; section: Row['content_section']; label: string; titleTag: string }[] = [
    { folder: 'notes', section: 'reading', label: 'Notes', titleTag: 'notes' },
    { folder: 'mcques', section: 'mcq', label: 'MCQs', titleTag: 'mcqs' },
  ];
  for (const { folder, section, label, titleTag } of sections) {
    const darkDir = path.join(ROOT, 'urdu', folder, 'dark');
    if (!existsSync(darkDir)) continue;
    const darkFiles: string[] = require('node:fs').readdirSync(darkDir);
    for (const chapter of CHAPTERS.urdu!) {
      const token = URDU_FILE_TOKEN_BY_ORDER[chapter.order];
      const darkFile = token && darkFiles.find((f) => f.toLowerCase().includes(token.toLowerCase()));
      if (!darkFile) continue;
      const lightFile = darkFile.replace(/Dark\.pdf$/i, 'Light.pdf');
      const txtFile = darkFile.replace(/\.pdf$/i, '.txt').replace(/_Dark/i, '');
      pushRow(rows, {
        subjectSlug,
        chapterSlug: chapter.slug,
        chapterId: chapter.id,
        contentSection: section,
        title: `Urdu — Chapter ${chapter.order}: ${chapter.name} — ${label}`,
        darkAbs: path.join(darkDir, darkFile),
        lightAbs: path.join(ROOT, 'urdu', folder, 'light', lightFile),
        txtAbs: path.join(ROOT, 'urdu', folder, 'txt', txtFile),
        titleSlug: `${slugify(chapter.name)}-${titleTag}`,
      });
    }
    // "Ch_JumloKiDurusti" (sentence-correction grammar drill) isn't tied to any
    // specific chapter/poem — catalog it as a general, chapter-less resource.
    const generalFile = darkFiles.find((f) => f.includes('JumloKiDurusti'));
    if (generalFile) {
      const lightFile = generalFile.replace(/Dark\.pdf$/i, 'Light.pdf');
      const txtFile = generalFile.replace(/\.pdf$/i, '.txt').replace(/_Dark/i, '');
      pushRow(rows, {
        subjectSlug,
        chapterSlug: 'general',
        chapterId: null,
        contentSection: section,
        title: `Urdu — Jumlo Ki Durusti (Grammar) — ${label}`,
        darkAbs: path.join(darkDir, generalFile),
        lightAbs: path.join(ROOT, 'urdu', folder, 'light', lightFile),
        txtAbs: path.join(ROOT, 'urdu', folder, 'txt', txtFile),
        titleSlug: `jumlo-ki-durusti-${titleTag}`,
      });
    }
  }
  return rows;
}

// --- Mathematics: per-unit exercises/ (reading) + mcques/ (mcq), MULTIPLE files
// per unit (Exercise N.1, N.2, ..., Review). Folder labels for units 1-6 are
// simply wrong (e.g. "Unit 1 – Complex Numbers") but the file CONTENT is
// verified-correct grade-9 material (Unit 1's content is Real Numbers, Unit 3's
// is Sets and Functions, etc.) — so units are matched by POSITION only here,
// never by the folder's own (unreliable) topic text.
function extractMathExerciseKey(filename: string): string | null {
  const numMatch = filename.match(/(\d+\.\d+)/);
  if (numMatch) return numMatch[1]!;
  if (/review/i.test(filename)) return 'review';
  return null;
}

function discoverMath() {
  const rows: Row[] = [];
  const subjectSlug = 'mathematics';
  const fs = require('node:fs');
  const darkBase = path.join(ROOT, 'math/dark');
  const unitFolders: string[] = fs
    .readdirSync(darkBase, { withFileTypes: true })
    .filter((e: any) => e.isDirectory())
    .map((e: any) => e.name);

  for (const chapter of CHAPTERS.mathematics!) {
    const folder = unitFolders.find((name) => extractOrderNumber(name) === chapter.order);
    if (!folder) continue;

    for (const [subfolder, section] of [
      ['exercises', 'reading'],
      ['mcques', 'mcq'],
    ] as const) {
      const darkDir = path.join(darkBase, folder, subfolder);
      if (!existsSync(darkDir)) continue;
      const darkFiles: string[] = fs.readdirSync(darkDir);
      const lightDir = path.join(ROOT, 'math/light', folder, subfolder);
      const lightFiles: string[] = existsSync(lightDir) ? fs.readdirSync(lightDir) : [];
      // txt has an extra nested "txt" folder per unit: math/txt/<unit>/txt/<subfolder>/
      const txtDir = path.join(ROOT, 'math/txt', folder, 'txt', subfolder);
      const txtFiles: string[] = existsSync(txtDir) ? fs.readdirSync(txtDir) : [];

      const seenKeys = new Set<string>();
      for (const darkFile of darkFiles) {
        const key = extractMathExerciseKey(darkFile);
        if (!key || seenKeys.has(key)) continue;
        seenKeys.add(key);
        const lightFile = lightFiles.find((f) => extractMathExerciseKey(f) === key);
        const txtFile = txtFiles.find((f) => extractMathExerciseKey(f) === key);
        const isReview = key === 'review';
        const label = isReview
          ? section === 'mcq'
            ? 'Review Exercise — MCQs'
            : 'Review Exercise (Solved)'
          : section === 'mcq'
            ? `Exercise ${key} — MCQs`
            : `Exercise ${key} (Solved)`;
        pushRow(rows, {
          subjectSlug,
          chapterSlug: chapter.slug,
          chapterId: chapter.id,
          contentSection: section,
          title: `Mathematics — Chapter ${chapter.order}: ${chapter.name} — ${label}`,
          darkAbs: path.join(darkDir, darkFile),
          lightAbs: lightFile ? path.join(lightDir, lightFile) : undefined,
          txtAbs: txtFile ? path.join(txtDir, txtFile) : undefined,
          titleSlug: isReview ? `review-exercise-${section}` : `exercise-${key.replace('.', '-')}-${section}`,
        });
      }
    }
  }
  return rows;
}

// --- Tarjuma Tul Quran (via notes/T_Q): notes/ (reading) + mcques/ (mcq), surahs 1-12 only ---
function discoverTarjumaTulQuran() {
  const rows: Row[] = [];
  const subjectSlug = 'tarjuma-tul-quran';
  const sections: { folder: string; section: Row['content_section']; label: string; titleTag: string }[] = [
    { folder: 'notes', section: 'reading', label: 'Notes', titleTag: 'notes' },
    { folder: 'mcques', section: 'mcq', label: 'MCQs', titleTag: 'mcqs' },
  ];
  for (const { folder, section, label, titleTag } of sections) {
    const darkDir = path.join(ROOT, 'T_Q', folder, 'dark');
    if (!existsSync(darkDir)) continue;
    const darkFiles: string[] = require('node:fs').readdirSync(darkDir);
    for (const chapter of CHAPTERS['tarjuma-tul-quran']!) {
      const surahKey = chapter.name.replace(/^Surah\s+/i, '').replace(/[^a-zA-Z]/g, '').toLowerCase();
      const darkFile = darkFiles.find((f) => f.replace(/[^a-zA-Z]/g, '').toLowerCase().includes(surahKey));
      if (!darkFile) continue;
      // light/txt may exist as numbered ("1_SurahMaryam...") or non-numbered ("SurahMaryam...") —
      // dark only has non-numbered; prefer light/txt files matching the SAME base as the dark one
      // (strip a leading "<N>_" if the dark file has none), falling back to any name match.
      const lightDir = path.join(ROOT, 'T_Q', folder, 'light');
      const txtDir = path.join(ROOT, 'T_Q', folder, 'txt');
      const lightFiles: string[] = existsSync(lightDir) ? require('node:fs').readdirSync(lightDir) : [];
      const txtFiles: string[] = existsSync(txtDir) ? require('node:fs').readdirSync(txtDir) : [];
      const lightFile =
        lightFiles.find((f) => f.replace(/^\d+_/, '') === darkFile.replace(/Dark\.pdf$/i, 'Light.pdf')) ||
        lightFiles.find((f) => f.replace(/[^a-zA-Z]/g, '').toLowerCase().includes(surahKey));
      const txtBase = darkFile.replace(/_Dark\.pdf$/i, '').replace(/\.pdf$/i, '');
      const txtFile =
        txtFiles.find((f) => f.replace(/^\d+_/, '').replace(/\.txt$/i, '') === txtBase) ||
        txtFiles.find((f) => f.replace(/[^a-zA-Z]/g, '').toLowerCase().includes(surahKey));
      pushRow(rows, {
        subjectSlug,
        chapterSlug: chapter.slug,
        chapterId: chapter.id,
        contentSection: section,
        title: `Tarjuma Tul Quran — ${chapter.name} — ${label}`,
        darkAbs: path.join(darkDir, darkFile),
        lightAbs: lightFile ? path.join(lightDir, lightFile) : undefined,
        txtAbs: txtFile ? path.join(txtDir, txtFile) : undefined,
        titleSlug: `${slugify(chapter.name)}-${titleTag}`,
      });
    }
  }
  return rows;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const onlySubject = args.find((a) => a.startsWith('--subject='))?.split('=')[1];

  let rows: Row[] = [
    ...discoverStandard('chemistry', 'chemistry', { mcq: ['MCQs'], short: ['ShortQ'], long: ['LongQ'] }),
    // 'ShortQ'/'LongQ' also match the longer 'ShortQuestions'/'LongQuestions' variant
    // some Computer Science chapters use — .includes() makes one token set cover both.
    ...discoverStandard('computer-science', 'com', { mcq: ['MCQs'], short: ['ShortQ'], long: ['LongQ'] }),
    ...discoverPhysics(),
    ...discoverEnglish(),
    ...discoverUrdu(),
    ...discoverMath(),
    ...discoverTarjumaTulQuran(),
  ];

  if (onlySubject) rows = rows.filter((r) => r.subject_slug === onlySubject);

  console.log(`Discovered ${rows.length} resources.${dryRun ? ' (DRY RUN — no upload)' : ''}`);
  const bySubject = new Map<string, number>();
  for (const row of rows) bySubject.set(row.subject_slug, (bySubject.get(row.subject_slug) || 0) + 1);
  for (const [subj, count] of bySubject) console.log(`  ${subj}: ${count}`);

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

  const manifestPath = path.join(process.cwd(), dryRun ? '9th-library-manifest.dryrun.json' : '9th-library-manifest.json');
  writeFileSync(manifestPath, JSON.stringify(rows, null, 2));
  console.log(`Manifest written to: ${manifestPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
