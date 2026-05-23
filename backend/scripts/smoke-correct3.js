const { parse } = require('mrz');
const out = parse([
  'P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<',
  'L89890ZC36UTO7408122F1204159ZE184226B<<<<<10',
]);
const d = out.details.find((x) => x.field === 'documentNumberCheckDigit');
console.log(JSON.stringify(d, null, 2));
