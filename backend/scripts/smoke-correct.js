const { icaoCheckDigit, correctField } = require('../dist/services/mrz/correctCheckDigits');
const { parseMrz } = require('../dist/services/mrz/parseMrz');

console.log('--- check digit algo ---');
console.log('L898902C3 =>', icaoCheckDigit('L898902C3'), '(expected 6)');
console.log('740812 =>', icaoCheckDigit('740812'), '(expected 2)');

console.log('--- correct: O <-> 0 ---');
console.log(correctField('LO9890OC3', '6'));  // expect L898900C3? Actually expects original 6
console.log('--- correct: I <-> 1 ---');
console.log(correctField('L8989O2I3', '6'));

console.log('--- end-to-end with OCR-style errors in document number ---');
// Original valid: 'L898902C3' check digit 6
// Corrupt the 2 -> Z (common OCR confusion). New check digit would be 7, so digit 6 fails.
// Corrector should swap Z back to 2 to make the digit valid.
const corrupted = [
  'P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<',
  'L89890ZC36UTO7408122F1204159ZE184226B<<<<<10',
];
const r = parseMrz(corrupted, 'TD3');
console.log(JSON.stringify(r, null, 2));
