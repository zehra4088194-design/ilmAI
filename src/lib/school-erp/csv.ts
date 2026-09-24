// ============================================
// CSV PARSING FOR SCHOOL BULK IMPORT
// Deliberately dependency-free and RFC 4180 shaped: quoted fields, escaped
// double quotes inside them, and commas or newlines inside quotes. Real school
// exports come out of Excel, so BOM and CRLF both have to survive.
// ============================================

export type CsvRow = Record<string, string>;

export function parseCsv(input: string): { headers: string[]; rows: CsvRow[] } {
  const text = input.replace(/^﻿/, '');
  const records: string[][] = [];
  let field = '';
  let record: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      record.push(field);
      field = '';
    } else if (char === '\r') {
      // Swallow: the \n that follows closes the record.
    } else if (char === '\n') {
      record.push(field);
      records.push(record);
      record = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (field.length || record.length) {
    record.push(field);
    records.push(record);
  }

  const nonEmpty = records.filter((item) => item.some((value) => value.trim().length));
  if (!nonEmpty.length) return { headers: [], rows: [] };

  const headers = (nonEmpty[0] || []).map((value) => normalizeHeader(value));
  const rows = nonEmpty.slice(1).map((values) => {
    const row: CsvRow = {};
    headers.forEach((header, position) => {
      if (header) row[header] = String(values[position] ?? '').trim();
    });
    return row;
  });

  return { headers, rows };
}

// "Full Name", "full-name" and "FULL_NAME" all become "full_name" so a school
// can hand us whatever their previous system exported.
function normalizeHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

export function toCsv(headers: string[], rows: Array<Array<string | number | null | undefined>>) {
  const escape = (value: string | number | null | undefined) => {
    const text = String(value ?? '');
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [headers.map(escape).join(','), ...rows.map((row) => row.map(escape).join(','))].join('\r\n');
}
