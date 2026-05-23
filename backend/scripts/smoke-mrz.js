const { parseMrz, extractMrzLines } = require('../dist/services/mrz/parseMrz');

// Canonical TD3 sample from the mrz package docs
const td3 = [
  'P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<',
  'L898902C36UTO7408122F1204159ZE184226B<<<<<10',
];

console.log('--- direct parse TD3 ---');
console.log(JSON.stringify(parseMrz(td3, 'TD3'), null, 2));

const ocrText = `Some noise\n${td3[0]}\n${td3[1]}\nmore noise`;
console.log('--- extract from OCR-like text ---');
const extracted = extractMrzLines(ocrText, 'passport');
console.log(extracted);
if (extracted) {
  console.log(JSON.stringify(parseMrz(extracted.lines, extracted.format), null, 2));
}

// TD1 sample
const td1 = [
  'I<UTOD231458907<<<<<<<<<<<<<<<',
  '7408122F1204159UTO<<<<<<<<<<<6',
  'ERIKSSON<<ANNA<MARIA<<<<<<<<<<',
];
console.log('--- direct parse TD1 ---');
console.log(JSON.stringify(parseMrz(td1, 'TD1'), null, 2));
