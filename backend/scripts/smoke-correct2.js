const { icaoCheckDigit, correctField } = require('../dist/services/mrz/correctCheckDigits');
console.log('digit for L89890ZC3 =', icaoCheckDigit('L89890ZC3'));
console.log('digit for LB9890ZC3 =', icaoCheckDigit('LB9890ZC3'));
console.log('digit for L898902C3 =', icaoCheckDigit('L898902C3'));
console.log('correct("L89890ZC3", "6") =', correctField('L89890ZC3', '6'));
console.log('correct("L89890ZC3", "7") =', correctField('L89890ZC3', '7'));
