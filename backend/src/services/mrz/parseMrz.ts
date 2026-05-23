import { parse as mrzParse } from 'mrz';
import type { DocType, ScannedFields, ScanWarning, Sex } from '../../types/ScannedDocument';
import { correctField } from './correctCheckDigits';

export interface MrzParseResult {
  fields: ScannedFields;
  warnings: ScanWarning[];
  rawMrz: string[];
  detectedDocType: DocType;
}

const MRZ_CHARS_RE = /^[A-Z0-9<]+$/;

function normaliseLine(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/«|»/g, '<')
    .replace(/[‹›«»]/g, '<')
    .replace(/[—–−‐]/g, '<')
    .replace(/[^A-Z0-9<]/g, '');
}

function padOrTrim(line: string, targetLen: number): string {
  if (line.length === targetLen) return line;
  if (line.length > targetLen) return line.slice(0, targetLen);
  return line.padEnd(targetLen, '<');
}

function looksLikeTd1Start(line: string): boolean {
  // TD1 doc code: I, A or C (often followed by <).
  return /^[IAC]/.test(line);
}

function looksLikeTd3Start(line: string): boolean {
  // TD3 doc code: P (passport), often "P<".
  return /^P/.test(line);
}

export function extractMrzLines(
  ocrText: string,
  hint?: DocType,
): { lines: string[]; format: 'TD1' | 'TD3' } | null {
  const candidates = ocrText
    .split(/\r?\n/)
    .map(normaliseLine)
    .filter((l) => l.length >= 28 && MRZ_CHARS_RE.test(l));

  if (candidates.length === 0) return null;

  // Scan from the BOTTOM of the document — MRZ is always at the bottom of an
  // ID page. Within that, prefer triples/pairs whose first line starts with a
  // valid MRZ document code (I/A/C for TD1, P for TD3). Fall back to any
  // shape-matching group if no doc-code anchor is found.

  const findTd3 = (requireDocCode: boolean): string[] | null => {
    for (let i = candidates.length - 2; i >= 0; i--) {
      const a = candidates[i];
      const b = candidates[i + 1];
      if (Math.abs(a.length - 44) > 4 || Math.abs(b.length - 44) > 4) continue;
      if (requireDocCode && !looksLikeTd3Start(a)) continue;
      return [padOrTrim(a, 44), padOrTrim(b, 44)];
    }
    return null;
  };

  const findTd1 = (requireDocCode: boolean): string[] | null => {
    for (let i = candidates.length - 3; i >= 0; i--) {
      const a = candidates[i];
      const b = candidates[i + 1];
      const c = candidates[i + 2];
      if (
        Math.abs(a.length - 30) > 3 ||
        Math.abs(b.length - 30) > 3 ||
        Math.abs(c.length - 30) > 3
      ) {
        continue;
      }
      if (requireDocCode && !looksLikeTd1Start(a)) continue;
      return [padOrTrim(a, 30), padOrTrim(b, 30), padOrTrim(c, 30)];
    }
    return null;
  };

  const order: Array<'TD1' | 'TD3'> = hint === 'national_id' ? ['TD1', 'TD3'] : ['TD3', 'TD1'];

  // First pass: require document-code anchor.
  for (const fmt of order) {
    const lines = fmt === 'TD1' ? findTd1(true) : findTd3(true);
    if (lines) return { lines, format: fmt };
  }
  // Second pass: fall back to shape-only matching.
  for (const fmt of order) {
    const lines = fmt === 'TD1' ? findTd1(false) : findTd3(false);
    if (lines) return { lines, format: fmt };
  }
  return null;
}

function isoDate(yymmdd: string | null | undefined, pivotYear = 30): string {
  if (!yymmdd || yymmdd.length !== 6) return '';
  const yy = parseInt(yymmdd.slice(0, 2), 10);
  const mm = yymmdd.slice(2, 4);
  const dd = yymmdd.slice(4, 6);
  if (Number.isNaN(yy)) return '';
  const year = yy <= pivotYear ? 2000 + yy : 1900 + yy;
  return `${year}-${mm}-${dd}`;
}

function expiryIsoDate(yymmdd: string | null | undefined): string {
  if (!yymmdd || yymmdd.length !== 6) return '';
  const yy = parseInt(yymmdd.slice(0, 2), 10);
  const mm = yymmdd.slice(2, 4);
  const dd = yymmdd.slice(4, 6);
  if (Number.isNaN(yy)) return '';
  const year = 2000 + yy;
  return `${year}-${mm}-${dd}`;
}

function pickField(parsed: any, name: string): any {
  const f = parsed?.fields?.[name];
  return f === undefined || f === null ? '' : f;
}

function detailsWarnings(parsed: any): ScanWarning[] {
  const warnings: ScanWarning[] = [];
  const details: Array<{ field?: string; label?: string; valid?: boolean; error?: string; line?: number }> =
    parsed?.details || [];
  for (const d of details) {
    if (d.valid === false) {
      const fieldName = d.field || d.label || 'mrz';
      warnings.push({
        field: fieldName,
        message: d.error || `Check digit failed for ${fieldName}`,
      });
    }
  }
  return warnings;
}

interface CorrectionApplied {
  field: string;
  from: string;
  to: string;
}

function rawFromRanges(ranges: any[] | undefined): string {
  if (!ranges) return '';
  return ranges
    .map((r) => (typeof r?.raw === 'string' ? r.raw : ''))
    .join('');
}

function applyCheckDigitCorrections(parsed: any, fields: ScannedFields): CorrectionApplied[] {
  const corrections: CorrectionApplied[] = [];
  const details: any[] = parsed?.details || [];

  for (const d of details) {
    if (!d?.field || !String(d.field).endsWith('CheckDigit')) continue;
    if (d.valid !== false) continue;
    // mrz v4 nulls `value` on invalid digits; the observed char is at ranges[0].raw.
    const observed = String(d.value || d.ranges?.[0]?.raw || '');
    if (!/^[0-9]$/.test(observed)) continue;
    // First range is the check digit itself; remaining ranges are the field source.
    const sourceRanges = Array.isArray(d.ranges) ? d.ranges.slice(1) : [];
    const rawField = rawFromRanges(sourceRanges);
    if (!rawField) continue;

    const corrected = correctField(rawField, observed);
    if (!corrected || corrected === rawField) continue;

    const base = String(d.field).replace(/CheckDigit$/, '');
    switch (base) {
      case 'documentNumber': {
        const clean = corrected.replace(/<+$/g, '');
        if (fields.documentNumber && clean !== fields.documentNumber) {
          corrections.push({ field: 'documentNumber', from: fields.documentNumber, to: clean });
          fields.documentNumber = clean;
        }
        break;
      }
      case 'birthDate': {
        if (corrected.length === 6 && /^[0-9]{6}$/.test(corrected)) {
          const iso = isoDate(corrected);
          if (iso && iso !== fields.dateOfBirth) {
            corrections.push({ field: 'dateOfBirth', from: fields.dateOfBirth, to: iso });
            fields.dateOfBirth = iso;
          }
        }
        break;
      }
      case 'expirationDate': {
        if (corrected.length === 6 && /^[0-9]{6}$/.test(corrected)) {
          const iso = expiryIsoDate(corrected);
          if (iso && iso !== fields.expiryDate) {
            corrections.push({ field: 'expiryDate', from: fields.expiryDate, to: iso });
            fields.expiryDate = iso;
          }
        }
        break;
      }
    }
  }
  return corrections;
}

export function parseMrz(mrzLines: string[], format: 'TD1' | 'TD3'): MrzParseResult {
  let parsed: any;
  let parseError: string | null = null;
  try {
    parsed = mrzParse(mrzLines);
  } catch (err: any) {
    parseError = err?.message || String(err);
    parsed = { fields: {}, details: [], valid: false };
  }

  const surname = String(pickField(parsed, 'lastName') || '').trim();
  const givenNames = String(pickField(parsed, 'firstName') || '').trim();
  const documentNumber = String(pickField(parsed, 'documentNumber') || '').trim();
  const nationality = String(pickField(parsed, 'nationality') || '').trim();
  const sexRaw = String(pickField(parsed, 'sex') || '').trim().toLowerCase();
  const sex: Sex =
    sexRaw === 'male' || sexRaw === 'm'
      ? 'M'
      : sexRaw === 'female' || sexRaw === 'f'
      ? 'F'
      : sexRaw === 'x' || sexRaw === 'unspecified'
      ? 'X'
      : '';

  const birthRaw = String(pickField(parsed, 'birthDate') || '');
  const expiryRaw = String(pickField(parsed, 'expirationDate') || '');

  const fields: ScannedFields = {
    surname,
    givenNames,
    documentNumber,
    nationality,
    dateOfBirth: isoDate(birthRaw),
    sex,
    expiryDate: expiryIsoDate(expiryRaw),
  };

  const corrections = applyCheckDigitCorrections(parsed, fields);

  const warnings = detailsWarnings(parsed);
  if (parseError) {
    warnings.unshift({ field: 'mrz', message: `MRZ parse error: ${parseError}` });
  }
  for (const c of corrections) {
    warnings.push({
      field: c.field,
      message: `Auto-corrected from "${c.from}" to "${c.to}" using check digit. Verify against the document.`,
    });
  }

  const detectedDocType: any =
    format === 'TD1' ? 'national_id' : 'passport';

  return {
    fields,
    warnings,
    rawMrz: mrzLines,
    detectedDocType,
  };
}
