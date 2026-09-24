import fs from 'node:fs';
import path from 'node:path';

const SOURCE_ROOT = path.resolve('src');
const ALLOWED_PATHS = [
  `${path.sep}lib${path.sep}i18n${path.sep}translations.ts`,
  `${path.sep}lib${path.sep}navigation${path.sep}destinations.ts`,
  `${path.sep}features${path.sep}ai-selector${path.sep}SideChatWidget${path.sep}`,
  `${path.sep}features${path.sep}privacy${path.sep}DataRetentionNotice${path.sep}`,
];
const ROMAN_URDU_COPY =
  /\b(?:nahi|nahin|zaroori|yahan|yahaan|aap|abhi|sirf|baaki|parhai|padhai|sawal|sawaal|jawab|galat|ghalat|dobara|tum|tumhara|yeh|aur|hai|hain|karne|karo|karein|gaye|wali|wala|samjhao|batao|banwao|asaan|theek|lafzon|alfaz|tashreeh|mazmoon|khulasa|ibarat|waqia|tafseel|tareeqa|chahiye|mujhe|thori)\b/i;
const UNPROFESSIONAL_PRODUCT_COPY = [
  /\bAI Testing\b/i,
  /\bAI text attached\b/i,
  /\bAI text ready\b/i,
  /\b(?:Grok|Gemini|Groq|Claude|ChatGPT) file analysis\b/i,
  /\bGenerate a test with (?:Grok|Gemini|Groq|Claude|ChatGPT)\b/i,
  /\bAI gateway was unavailable\b/i,
  /\banalyzed locally\b/i,
  /\bsource files? connected\b/i,
  /\bProcessing (?:diagram|handwritten|printed) scan\b/i,
  /\bseparate (?:Grok|Gemini|Groq|Claude|ChatGPT) request\b/i,
  /\buploaded chapter source files?\b/i,
  /\b3D conformer\s*\/\s*2D fallback\b/i,
  /\bOCR Text\b/i,
];

const findings = [];

function isAllowed(filePath) {
  return (
    ALLOWED_PATHS.some((allowedPath) => filePath.includes(allowedPath)) ||
    /\.test\.[cm]?[jt]sx?$/.test(filePath)
  );
}

function scanDirectory(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      scanDirectory(filePath);
      continue;
    }
    if (!/\.[jt]sx?$/.test(entry.name)) continue;

    const romanUrduAllowed = isAllowed(filePath);

    fs.readFileSync(filePath, 'utf8')
      .split(/\r?\n/)
      .forEach((line, index) => {
        if (!romanUrduAllowed && ROMAN_URDU_COPY.test(line)) {
          findings.push(`${path.relative(process.cwd(), filePath)}:${index + 1}: ${line.trim()}`);
        }
        if (UNPROFESSIONAL_PRODUCT_COPY.some((pattern) => pattern.test(line))) {
          findings.push(
            `${path.relative(process.cwd(), filePath)}:${index + 1}: unprofessional product copy: ${line.trim()}`
          );
        }
      });
  }
}

scanDirectory(SOURCE_ROOT);

if (findings.length > 0) {
  console.error('Hardcoded Roman Urdu copy found outside approved locale/search files:');
  console.error(findings.join('\n'));
  process.exit(1);
}

console.log('English copy check passed.');
