const { extractMrzLines, parseMrz } = require('../dist/services/mrz/parseMrz');

// Exact OCR output from the user's Tajik national ID via Google Vision
const ocrText = `28.07.1998
Hamond Address
WAXРИ душAНбE, CHO
кOHCТИТуTсиЯ 581 A3 01.10.2021 Coл
Basts on an
Marital status
MYYAPPAN/SINGLE
Typyxn xyn na резуcи
мanсубият/ Blood group
0(1)Rh+
MaкOM ODCHOдa/ Issuing Authority
PMA/
Tax Payer ID number
037878400
WBKД-1 ДAP HOжияи синои шдушАHбЕ
DMIA-1 IN SINO DISTRICT OF DUSHANBE
IDTJKA0537743013500034914834<<
9807280M3405123TJK<<<<<<<<<<<0
KAMOLOV<<SHAHOBIDDIN<<<<<<<<<<`;

const extracted = extractMrzLines(ocrText, 'national_id');
console.log('Extracted:', extracted);
if (extracted) {
  const parsed = parseMrz(extracted.lines, extracted.format);
  console.log('\nParsed:');
  console.log(JSON.stringify(parsed, null, 2));
}
