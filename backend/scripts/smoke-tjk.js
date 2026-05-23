const { parseMrz } = require('../dist/services/mrz/parseMrz');

// Tajik passport — fictional but with valid ISO code TJK and matching check digits.
// Built so check digits are correct.
const td3 = [
  'P<TJKRAHIMOV<<KARIM<<<<<<<<<<<<<<<<<<<<<<<<<',
  'AB12345677TJK8501012M3001017<<<<<<<<<<<<<<00',
];

console.log(JSON.stringify(parseMrz(td3, 'TD3'), null, 2));

// Uzbek national ID (TD1) — valid ISO code UZB.
const td1 = [
  'I<UZBAA12345677<<<<<<<<<<<<<<<',
  '9001011F3501016UZB<<<<<<<<<<<8',
  'KARIMOV<<AZIZ<<<<<<<<<<<<<<<<<',
];
console.log(JSON.stringify(parseMrz(td1, 'TD1'), null, 2));
