export type CsvValue = string | number | null;

// Spreadsheets in pt-BR use the semicolon as the list separator.
const CSV_SEPARATOR = ';';
const CSV_LINE_BREAK = '\r\n';
// Without the byte order mark, Excel reads UTF-8 accents as Latin-1.
const UTF8_BOM = '﻿';
// A cell starting with one of these is run as a formula by spreadsheets.
const FORMULA_PREFIXES = ['=', '+', '-', '@'];

export function escapeCsvValue(value: CsvValue): string {
  if (value === null) {
    return '';
  }
  let text = String(value);
  if (typeof value === 'string' && FORMULA_PREFIXES.includes(text.charAt(0))) {
    text = `'${text}`;
  }
  if (/[;"\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function toCsv(headers: string[], rows: CsvValue[][]): string {
  const lines = [headers, ...rows].map((cells) =>
    cells.map(escapeCsvValue).join(CSV_SEPARATOR),
  );
  return `${UTF8_BOM}${lines.join(CSV_LINE_BREAK)}`;
}

export function formatMoney(value: number): string {
  return value.toFixed(2).replace('.', ',');
}
