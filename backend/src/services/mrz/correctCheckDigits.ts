// ICAO 9303 check-digit algorithm.
// Weights cycle 7-3-1 over the field characters.
// Char values: digits 0-9 = 0-9; letters A-Z = 10-35; '<' = 0.
const CHAR_VALUE: Record<string, number> = {};
for (let i = 0; i < 10; i++) CHAR_VALUE[String(i)] = i;
for (let i = 0; i < 26; i++) CHAR_VALUE[String.fromCharCode(65 + i)] = 10 + i;
CHAR_VALUE['<'] = 0;

const WEIGHTS = [7, 3, 1];

export function icaoCheckDigit(field: string): string {
  let sum = 0;
  for (let i = 0; i < field.length; i++) {
    const v = CHAR_VALUE[field[i]];
    if (v === undefined) return '?';
    sum += v * WEIGHTS[i % 3];
  }
  return String(sum % 10);
}

// Visually-similar character pairs that Tesseract commonly confuses on OCR-B.
const SWAPS: Record<string, string[]> = {
  '0': ['O', 'D', 'Q'],
  O: ['0', 'D', 'Q'],
  D: ['0', 'O'],
  Q: ['0', 'O'],
  '1': ['I', 'L', '7', 'T'],
  I: ['1', 'L', 'T'],
  L: ['1', 'I'],
  '7': ['1', 'T'],
  T: ['1', 'I', '7'],
  '5': ['S'],
  S: ['5'],
  '8': ['B'],
  B: ['8'],
  '2': ['Z'],
  Z: ['2'],
  '6': ['G'],
  G: ['6'],
  '9': ['g'],
  '4': ['A'],
  A: ['4'],
  '<': [],
};

/**
 * Try single- and double-character substitutions on `value` so that
 * icaoCheckDigit(value) === expected. Returns the corrected value if found,
 * or null if no correction works.
 */
export function correctField(value: string, expected: string): string | null {
  if (!value) return null;
  if (icaoCheckDigit(value) === expected) return value;

  // Single-char swaps first.
  for (let i = 0; i < value.length; i++) {
    const alts = SWAPS[value[i]];
    if (!alts) continue;
    for (const alt of alts) {
      const candidate = value.slice(0, i) + alt + value.slice(i + 1);
      if (icaoCheckDigit(candidate) === expected) return candidate;
    }
  }
  // Two-char swaps.
  for (let i = 0; i < value.length; i++) {
    const altsI = SWAPS[value[i]];
    if (!altsI) continue;
    for (const altI of altsI) {
      for (let j = i + 1; j < value.length; j++) {
        const altsJ = SWAPS[value[j]];
        if (!altsJ) continue;
        for (const altJ of altsJ) {
          const candidate =
            value.slice(0, i) + altI + value.slice(i + 1, j) + altJ + value.slice(j + 1);
          if (icaoCheckDigit(candidate) === expected) return candidate;
        }
      }
    }
  }
  return null;
}
