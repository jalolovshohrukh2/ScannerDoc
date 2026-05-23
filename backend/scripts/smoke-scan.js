const http = require('http');
const fs = require('fs');
const path = require('path');

const PNG_PATH = path.join(__dirname, 'smoke.png');

// 1x1 black PNG — Tesseract will return empty text, so we expect a 'no MRZ found' warning
const ONE_PX_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);
fs.writeFileSync(PNG_PATH, ONE_PX_PNG);

const boundary = '----nodescannerdocboundary' + Date.now();
const CRLF = '\r\n';
const head = Buffer.from(
  '--' +
    boundary +
    CRLF +
    'Content-Disposition: form-data; name="docType"' +
    CRLF +
    CRLF +
    'passport' +
    CRLF +
    '--' +
    boundary +
    CRLF +
    'Content-Disposition: form-data; name="front"; filename="front.png"' +
    CRLF +
    'Content-Type: image/png' +
    CRLF +
    CRLF,
);
const tail = Buffer.from(CRLF + '--' + boundary + '--' + CRLF);
const body = Buffer.concat([head, ONE_PX_PNG, tail]);

const req = http.request(
  {
    host: 'localhost',
    port: 4000,
    path: '/api/documents/scan',
    method: 'POST',
    headers: {
      'Content-Type': 'multipart/form-data; boundary=' + boundary,
      'Content-Length': body.length,
    },
  },
  (res) => {
    let chunks = [];
    res.on('data', (c) => chunks.push(c));
    res.on('end', () => {
      const text = Buffer.concat(chunks).toString('utf8');
      console.log('status', res.statusCode);
      console.log(text);
      try {
        const json = JSON.parse(text);
        const ok =
          json.docType === 'passport' &&
          typeof json.fields === 'object' &&
          Array.isArray(json.warnings) &&
          typeof json.images?.frontUrl === 'string';
        console.log('shape-ok:', ok);
        process.exit(ok ? 0 : 2);
      } catch (e) {
        console.error('not JSON', e);
        process.exit(3);
      }
    });
  },
);
req.on('error', (e) => {
  console.error('request error', e);
  process.exit(1);
});
req.write(body);
req.end();
