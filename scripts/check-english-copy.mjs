import fs from 'node:fs';
import path from 'node:path';

const SOURCE_ROOT = path.resolve('src');
const ALLOWED_PATHS = [
  `${path.sep}lib${path.sep}i18n${path.sep}translations.ts`,
  `${path.sep}lib${path.sep}constants${path.sep}subjectSuggestions.ts`,
  `${path.sep}lib${path.sep}navigation${path.sep}destinations.ts`,
  `${path.sep}features${path.sep}ai-selector${path.sep}SideChatWidget${path.sep}`,
  `${path.sep}features${path.sep}privacy${path.sep}DataRetentionNotice${path.sep}`,
];
const ROMAN_URDU_COPY =
  /\b(?:nahi|nahin|zaroori|yahan|yahaan|aap|abhi|sirf|baaki|parhai|padhai|sawal|sawaal|jawab|galat|ghalat|dobara|tum|tumhara|yeh|aur|hai|hain|karne|karo|gaye|wali|wala)\b/i;

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
    if (!/\.[jt]sx?$/.test(entry.name) || isAllowed(filePath)) continue;

    fs.readFileSync(filePath, 'utf8')
      .split(/\r?\n/)
      .forEach((line, index) => {
        if (ROMAN_URDU_COPY.test(line)) {
          findings.push(`${path.relative(process.cwd(), filePath)}:${index + 1}: ${line.trim()}`);
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
