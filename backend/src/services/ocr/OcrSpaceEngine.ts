import type { OcrEngine, OcrMode } from './OcrEngine';

interface OcrSpaceResponse {
  IsErroredOnProcessing?: boolean;
  ErrorMessage?: string | string[];
  OCRExitCode?: number;
  ParsedResults?: Array<{
    ParsedText?: string;
    ErrorMessage?: string;
    FileParseExitCode?: number;
  }>;
}

const MIME_TO_NAME: Record<string, string> = {
  'image/jpeg': 'image.jpg',
  'image/jpg': 'image.jpg',
  'image/png': 'image.png',
  'image/webp': 'image.webp',
  'image/bmp': 'image.bmp',
};

export interface OcrSpaceOptions {
  apiKey: string;
  // 'eng' (default), 'rus', etc. Cyrillic visual mode uses 'rus'.
  // Engine 2 supports automatic language detection but uses more credits.
  engine?: 1 | 2 | 3;
  // 'apipro1' (us), 'apipro2' (eu), default is the free endpoint.
  endpoint?: string;
}

export class OcrSpaceEngine implements OcrEngine {
  private apiKey: string;
  private engineNumber: 1 | 2 | 3;
  private endpoint: string;

  constructor(opts: OcrSpaceOptions) {
    this.apiKey = opts.apiKey;
    // Engine 2 is multilingual + auto-detect; better for Cyrillic visual side.
    this.engineNumber = opts.engine ?? 2;
    this.endpoint = opts.endpoint || 'https://api.ocr.space/parse/image';
  }

  async extractText(image: Buffer, mode: OcrMode): Promise<string> {
    const language = mode === 'mrz' ? 'eng' : 'rus';

    const form = new FormData();
    const mime =
      image[0] === 0x89 && image[1] === 0x50
        ? 'image/png'
        : image[0] === 0xff && image[1] === 0xd8
        ? 'image/jpeg'
        : 'image/png';
    const filename = MIME_TO_NAME[mime] || 'image.png';
    // Copy into a fresh ArrayBuffer so Blob's type contract is satisfied
    // (Node Buffer may be SharedArrayBuffer-backed which TS rejects here).
    const ab = new ArrayBuffer(image.byteLength);
    new Uint8Array(ab).set(image);
    form.append('file', new Blob([ab], { type: mime }), filename);
    form.append('language', language);
    form.append('OCREngine', String(this.engineNumber));
    form.append('scale', 'true');
    form.append('isTable', 'false');
    form.append('detectOrientation', 'true');

    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers: { apikey: this.apiKey },
      body: form,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`OCR.space ${res.status}: ${text}`);
    }

    const data = (await res.json()) as OcrSpaceResponse;

    if (data.IsErroredOnProcessing) {
      const msg = Array.isArray(data.ErrorMessage)
        ? data.ErrorMessage.join('; ')
        : data.ErrorMessage || 'Unknown OCR.space error';
      throw new Error(`OCR.space: ${msg}`);
    }

    return (data.ParsedResults || [])
      .map((r) => r.ParsedText || '')
      .join('\n')
      .trim();
  }
}
