const { parse } = require('mrz');
const td3 = [
  'P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<',
  'L898902C36UTO7408122F1204159ZE184226B<<<<<10',
];
console.log(JSON.stringify(parse(td3), null, 2));
