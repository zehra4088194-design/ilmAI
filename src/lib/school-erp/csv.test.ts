import { describe, expect, it } from 'vitest';
import { parseCsv, toCsv } from './csv';

describe('parseCsv', () => {
  it('normalizes messy headers into snake_case keys', () => {
    const { headers, rows } = parseCsv('Full Name,Admission-Number,ROLL_NUMBER\nAyesha,2026-001,1');
    expect(headers).toEqual(['full_name', 'admission_number', 'roll_number']);
    expect(rows[0]).toEqual({ full_name: 'Ayesha', admission_number: '2026-001', roll_number: '1' });
  });

  it('keeps commas, newlines, and escaped quotes inside quoted fields', () => {
    const { rows } = parseCsv('full_name,address\n"Khan, Ayesha","House 4\nStreet 2"\n"He said ""hi""",Lahore');
    expect(rows[0]).toEqual({ full_name: 'Khan, Ayesha', address: 'House 4\nStreet 2' });
    expect(rows[1]).toEqual({ full_name: 'He said "hi"', address: 'Lahore' });
  });

  it('survives an Excel export: BOM, CRLF, and a trailing blank line', () => {
    const { headers, rows } = parseCsv('﻿full_name,email\r\nAyesha,a@example.com\r\n\r\n');
    expect(headers).toEqual(['full_name', 'email']);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.email).toBe('a@example.com');
  });

  it('returns no rows for empty input', () => {
    expect(parseCsv('   ')).toEqual({ headers: [], rows: [] });
  });

  it('treats missing trailing columns as empty strings', () => {
    const { rows } = parseCsv('full_name,email,phone\nAyesha,a@example.com');
    expect(rows[0]).toEqual({ full_name: 'Ayesha', email: 'a@example.com', phone: '' });
  });
});

describe('toCsv', () => {
  it('quotes only the values that need it and round-trips through parseCsv', () => {
    const csv = toCsv(['name', 'note'], [['Khan, Ayesha', 'said "hi"'], ['Bilal', 'plain']]);
    expect(csv.split('\r\n')[1]).toBe('"Khan, Ayesha","said ""hi"""');

    const { rows } = parseCsv(csv);
    expect(rows[0]).toEqual({ name: 'Khan, Ayesha', note: 'said "hi"' });
    expect(rows[1]).toEqual({ name: 'Bilal', note: 'plain' });
  });
});
