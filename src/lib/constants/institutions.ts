// Curated name lists used to power the free-text "institution name" suggestion
// dropdown on individual (non-institutional) signup — see RegisterForm's
// 'institution' step. This is NOT the real school_organizations/college_organizations
// search (that's SCHOOL_SEARCH_STEP, backed by /api/schools/search for institutional
// signups) — these are just well-known Pakistani institution names to speed up typing
// for students who picked "Individual" and are self-reporting where they study.
// Deliberately static/curated rather than DB-backed: this list has no admin/approval
// workflow attached to it, so it doesn't need to live in a table.

export const PAKISTAN_SCHOOLS: string[] = [
  'Beaconhouse School System',
  'The City School',
  'Lahore Grammar School (LGS)',
  'Roots School System',
  'Aitchison College',
  'Bahria Foundation College',
  'Army Public School and College',
  "Froebel's International School",
  'Bloomfield Hall School',
  'Divisional Public School',
  'Cadet College Hasan Abdal',
  'Cadet College Petaro',
  'Karachi Grammar School',
  "St. Patrick's High School",
  "St. Joseph's Convent School",
  'Convent of Jesus and Mary',
  'Foundation Public School',
  'Garrison School and College',
  'Islamabad Model School',
  'Federal Government Public School',
  'PAF Chapter Schools',
  'Punjab Group of Colleges - Schools',
  'Superior Group of Colleges - Schools',
  'Educators School System',
  "Allied School",
  'Learning Alliance',
  'Read Foundation',
  'Pakistan International School',
  'Wilkinson Girls High School',
  'Rising Sun Institute',
];

export const PAKISTAN_COLLEGES: string[] = [
  'Punjab Group of Colleges',
  'Superior Group of Colleges',
  'Government College University Lahore (GCU) - Intermediate',
  'Government College of Science',
  'Kinnaird College for Women',
  'Islamia College Peshawar',
  'DPS - Degree/Intermediate',
  'Forman Christian College (Intermediate)',
  'Government MAO College',
  'Cadet College Kohat',
  'Government Degree College',
  'Aspire College',
  'Divisional Public School & College',
  'Adamjee Government Science College',
  'Government National College',
  'Bahria College',
  'PAF Degree College',
  'Army Public College of Management Sciences',
  'Sir Syed Government Girls College',
  'Federal Urdu College',
];

export const PAKISTAN_UNIVERSITIES: string[] = [
  'University of the Punjab (PU)',
  'Quaid-i-Azam University (QAU)',
  'Lahore University of Management Sciences (LUMS)',
  'National University of Sciences and Technology (NUST)',
  'University of Engineering and Technology Lahore (UET)',
  'University of Karachi (KU)',
  'Aga Khan University (AKU)',
  'Dow University of Health Sciences (DUHS)',
  'King Edward Medical University (KEMU)',
  'Allama Iqbal Open University (AIOU)',
  'COMSATS University Islamabad',
  'FAST National University (NUCES)',
  'Institute of Business Administration (IBA) Karachi',
  'University of Agriculture Faisalabad (UAF)',
  'Bahauddin Zakariya University (BZU)',
  'University of Peshawar',
  'University of Sindh',
  'Balochistan University of Information Technology, Engineering and Management Sciences (BUITEMS)',
  'International Islamic University Islamabad (IIUI)',
  'Fatima Jinnah Medical University',
  'Punjab University College of Pharmacy',
  'University College of Pharmacy, Punjab University',
  'Faculty of Pharmacy, University of Karachi',
  'Riphah International University',
  'Islamia University of Bahawalpur (IUB)',
  'University of Health Sciences Lahore (UHS)',
  'Ziauddin University',
  'Jinnah Sindh Medical University (JSMU)',
  'Services Institute of Medical Sciences (SIMS)',
  'Sir Syed University of Engineering and Technology',
  'NED University of Engineering and Technology',
  'Ghulam Ishaq Khan Institute (GIKI)',
  'Air University',
  'National Textile University',
  'University of Management and Technology (UMT)',
  'University of Central Punjab (UCP)',
  'The University of Lahore (UOL)',
  'Superior University',
  'University of South Asia',
  'Hamdard University',
  'Mehran University of Engineering and Technology',
  'Government College University Faisalabad (GCUF)',
  'Government College University Lahore (GCU)',
  'National College of Arts (NCA)',
  'Virtual University of Pakistan',
  'Preston University',
  'Sargodha Medical College',
  'Nishtar Medical University',
  'Rawalpindi Medical University (RMU)',
  'Ayub Medical College',
  'Khyber Medical University',
  'Liaquat University of Medical and Health Sciences (LUMHS)',
];

/**
 * Filters a curated list by a typed query (case-insensitive substring match),
 * capped so the dropdown never gets unwieldy. Empty/1-character queries return
 * nothing — matches the same "start typing" threshold used elsewhere in signup.
 */
export function suggestInstitutions(list: string[], query: string, limit = 6): string[] {
  const term = query.trim().toLowerCase();
  if (term.length < 2) return [];
  return list.filter((name) => name.toLowerCase().includes(term)).slice(0, limit);
}
