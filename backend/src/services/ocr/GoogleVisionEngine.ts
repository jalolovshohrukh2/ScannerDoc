import type { OcrEngine, OcrMode } from './OcrEngine';

interface GoogleVisionResponse {
  responses?: Array<{
    fullTextAnnotation?: { text?: string };
    textAnnotations?: Array<{ description?: string }>;
    error?: { message?: string; code?: number };
  }>;
}

export class GoogleVisionEngine implements OcrEngine {
  constructor(private apiKey: string) {}

  async extractText(image: Buffer, mode: OcrMode): Promise<string> {
    const languageHints = mode === 'mrz' ? ['en'] : ['ru', 'en'];
    const body = {
      requests: [
        {
          image: { content: image.toString('base64') },
          features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
          imageContext: { languageHints },
        },
      ],
    };
    const url = `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(this.apiKey)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Google Vision API ${res.status}: ${text}`);
    }
    const data = (await res.json()) as GoogleVisionResponse;
    const r = data.responses?.[0];
    if (r?.error) {
      throw new Error(`Google Vision: ${r.error.message || 'unknown error'}`);
    }
    return r?.fullTextAnnotation?.text || r?.textAnnotations?.[0]?.description || '';
  }
}
