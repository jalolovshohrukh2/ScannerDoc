const { parseVisualText } = require('../dist/services/visual/parseVisualText');

const sample = `Раками шиноснома/ Восител
A05377430
Ҷумҳурии Тоҷикистон
Republic of Tajikistan
Шиноснома / Identity Card
Hacab/ Surname
КАМОЛОВ
KAMOLOV
Ном/ Name
ШАҲОБИДДИН
SHAHOBIDDIN
Номи падар/ Father's name
САЙВАЛИЕВИЧ
SAIVALIEVICH
Чипс Шахрванда
Nationality
Sex
TYK/TJK
M/M
Огози эътибор/
Dute of issue
13.05.2024
Санаи таваллуд/
Dute of birth
28.07.1998
---
Макоми додаа/ Issuing Authority
ШУБА-1 ДАР НОҲИЯИ СИНОИ Ш.ДУШАНБЕ
DMIA-1 IN SINO DISTRICT OF DUSHANBE`;

console.log(JSON.stringify(parseVisualText(sample), null, 2));
