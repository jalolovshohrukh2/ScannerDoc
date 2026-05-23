export interface SuggestedManual {
  patronymic: string;
  patronymicCyr: string;
  surnameCyr: string;
  givenNamesCyr: string;
  issuingAuthority: string;
  issuingAuthorityCyr: string;
  address: string;
}

export const EMPTY_SUGGESTED: SuggestedManual = {
  patronymic: '',
  patronymicCyr: '',
  surnameCyr: '',
  givenNamesCyr: '',
  issuingAuthority: '',
  issuingAuthorityCyr: '',
  address: '',
};

const CYR_CHAR = /[Ѐ-ӿ]/;
const LAT_CHAR = /[A-Z]/;

function isCyrillicLine(s: string): boolean {
  const t = s.trim();
  if (t.length < 2) return false;
  if (!CYR_CHAR.test(t)) return false;
  // No Latin letters (allow digits/punct).
  return !/[A-Za-z]/.test(t);
}

function isLatinNameLine(s: string): boolean {
  const t = s.trim();
  if (t.length < 2) return false;
  if (CYR_CHAR.test(t)) return false;
  // ALL CAPS letters, spaces, hyphens, apostrophes only.
  return /^[A-Z][A-Z\s'\-]*$/.test(t);
}

function looksLikeLabel(s: string): boolean {
  const t = s.trim();
  if (!t) return true;
  if (t.includes('/')) return true;
  // English/Tajik/Russian label keywords commonly used on IDs.
  return /\b(surname|name|nationality|sex|date|place|holder|signature|authority|id\s*no|country|number|issue|birth|expiry|expiration|gender|address|residence|тарих|санаи|ҷинс|номи|тааллуқ|шаҳрванд)\b/i.test(t);
}

interface LabeledExtract {
  cyr: string;
  lat: string;
}

function extractAfterLabel(
  lines: string[],
  labelTest: (s: string) => boolean,
  windowSize = 5,
): LabeledExtract {
  for (let i = 0; i < lines.length; i++) {
    if (!labelTest(lines[i])) continue;
    let cyr = '';
    let lat = '';
    for (let j = i + 1; j < Math.min(i + 1 + windowSize, lines.length); j++) {
      const t = lines[j].trim();
      if (!t) continue;
      // Hitting another labelled section ends the search.
      if (looksLikeLabel(t) && !cyr && !lat) continue; // skip nearby labels until first value found
      if (looksLikeLabel(t) && (cyr || lat)) break;
      if (!cyr && isCyrillicLine(t)) cyr = t;
      else if (!lat && isLatinNameLine(t)) lat = t;
      if (cyr && lat) break;
    }
    if (cyr || lat) return { cyr, lat };
  }
  return { cyr: '', lat: '' };
}

// Multi-line collector — for authority/address which may span several lines.
function extractBlock(
  lines: string[],
  labelTest: (s: string) => boolean,
  maxLines = 4,
): LabeledExtract {
  for (let i = 0; i < lines.length; i++) {
    if (!labelTest(lines[i])) continue;
    const cyrParts: string[] = [];
    const latParts: string[] = [];
    for (let j = i + 1; j < Math.min(i + 1 + maxLines, lines.length); j++) {
      const t = lines[j].trim();
      if (!t) continue;
      if (looksLikeLabel(t)) break;
      if (isCyrillicLine(t)) cyrParts.push(t);
      else if (isLatinNameLine(t) || /^[A-Z0-9][A-Z0-9\s.,'\-]+$/.test(t)) latParts.push(t);
    }
    if (cyrParts.length || latParts.length) {
      return { cyr: cyrParts.join(' '), lat: latParts.join(' ') };
    }
  }
  return { cyr: '', lat: '' };
}

export function parseVisualText(text: string): SuggestedManual {
  const lines = text.split(/\r?\n/);

  const surname = extractAfterLabel(lines, (s) =>
    /\b(surname|hacab|насаб)\b/i.test(s),
  );
  const given = extractAfterLabel(
    lines,
    (s) =>
      /\bname\b/i.test(s) &&
      !/surname/i.test(s) &&
      !/father/i.test(s) &&
      !/holder/i.test(s) &&
      !/family/i.test(s) &&
      !/full/i.test(s),
  );
  // Patronymic label varies: "Father's name", "Номи падар", "Отчество".
  const patron = extractAfterLabel(lines, (s) =>
    /(father'?s?\s+name|номи\s+падар|отчество)/iu.test(s),
  );
  const authority = extractBlock(lines, (s) =>
    /(issuing\s+authority|макоми\s+додаа|маком\s+додаа|orgaн)/iu.test(s),
  );
  const addr = extractBlock(lines, (s) =>
    /(\baddress\b|residence|суроға|сурога|манзил|прописка)/iu.test(s),
  );

  return {
    patronymic: patron.lat,
    patronymicCyr: patron.cyr,
    surnameCyr: surname.cyr,
    givenNamesCyr: given.cyr,
    issuingAuthority: authority.lat,
    issuingAuthorityCyr: authority.cyr,
    address: addr.lat || addr.cyr,
  };
}
