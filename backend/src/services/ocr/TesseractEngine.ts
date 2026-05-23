import { createWorker, Worker } from 'tesseract.js';
import sharp from 'sharp';
import type { OcrEngine, OcrMode } from './OcrEngine';

const MRZ_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<';
const ROTATIONS = [0, 90, 270, 180] as const;

type Preprocessor = (b: Buffer) => Promise<Buffer>;

function normLines(text: string): string[] {
  return text.split(/\r?\n/).map((line) =>
    line.toUpperCase().replace(/\s+/g, '').replace(/[^A-Z0-9<]/g, ''),
  );
}

function countMrzLines(text: string): number {
  return normLines(text).reduce(
    (acc, l) => (l.length >= 28 && /^[A-Z0-9<]+$/.test(l) ? acc + 1 : acc),
    0,
  );
}

/**
 * True only if the text actually contains a structurally valid MRZ block:
 *   - 2 consecutive lines of length 40-48 (TD3 passport), OR
 *   - 3 consecutive lines of length 27-33 (TD1 national ID).
 * Random garbage that happens to be 33 chars long does NOT pass this.
 */
function hasParseableMrz(text: string): boolean {
  const lines = normLines(text).filter((l) => /^[A-Z0-9<]+$/.test(l));
  // TD3
  for (let i = 0; i <= lines.length - 2; i++) {
    const a = lines[i].length;
    const b = lines[i + 1].length;
    if (a >= 40 && a <= 48 && b >= 40 && b <= 48) return true;
  }
  // TD1
  for (let i = 0; i <= lines.length - 3; i++) {
    const a = lines[i].length;
    const b = lines[i + 1].length;
    const c = lines[i + 2].length;
    if (a >= 27 && a <= 33 && b >= 27 && b <= 33 && c >= 27 && c <= 33) return true;
  }
  return false;
}

const MRZ_PREPROCESSORS: Preprocessor[] = [
  (b) => sharp(b).rotate().resize({ width: 1600, withoutEnlargement: true }).grayscale().normalize().toBuffer(),
  (b) => sharp(b).rotate().resize({ width: 1600, withoutEnlargement: true }).grayscale().sharpen().normalize().toBuffer(),
  (b) =>
    sharp(b)
      .rotate()
      .resize({ width: 1600, withoutEnlargement: true })
      .grayscale()
      .threshold(128)
      .toBuffer(),
];

export class TesseractEngine implements OcrEngine {
  private mrzWorker: Promise<Worker> | null = null;
  private visualWorker: Promise<Worker> | null = null;

  private getMrzWorker(): Promise<Worker> {
    if (!this.mrzWorker) {
      this.mrzWorker = (async () => {
        const worker = await createWorker('eng');
        await worker.setParameters({
          tessedit_char_whitelist: MRZ_CHARS,
          preserve_interword_spaces: '0',
        });
        return worker;
      })();
    }
    return this.mrzWorker;
  }

  private getVisualWorker(): Promise<Worker> {
    if (!this.visualWorker) {
      this.visualWorker = (async () => {
        // rus covers most Tajik/Uzbek Cyrillic glyphs; eng captures Latin.
        // Tesseract.js downloads these models on first use.
        const worker = await createWorker(['rus', 'eng']);
        return worker;
      })();
    }
    return this.visualWorker;
  }

  async extractText(image: Buffer, mode: OcrMode): Promise<string> {
    return mode === 'mrz' ? this.extractMrz(image) : this.extractVisual(image);
  }

  private async extractMrz(image: Buffer): Promise<string> {
    const worker = await this.getMrzWorker();

    // Try several preprocessing variants at each rotation. Keep the result
    // that yields the most MRZ-shaped lines (or that contains enough lines
    // to look like a real MRZ).
    let best = { text: '', score: 0 };

    for (const preprocess of MRZ_PREPROCESSORS) {
      const base = await preprocess(image);
      for (const deg of ROTATIONS) {
        const buf = deg === 0 ? base : await sharp(base).rotate(deg).toBuffer();
        const { data } = await worker.recognize(buf);
        const text = data.text || '';
        // Only early-exit when the text is structurally a valid MRZ block.
        if (hasParseableMrz(text)) return text;
        const score = countMrzLines(text);
        if (score > best.score) best = { text, score };
      }
    }
    return best.text;
  }

  private async extractVisual(image: Buffer): Promise<string> {
    const worker = await this.getVisualWorker();
    const buf = await sharp(image)
      .rotate()
      .resize({ width: 1600, withoutEnlargement: true })
      .grayscale()
      .normalize()
      .toBuffer();
    const { data } = await worker.recognize(buf);
    return data.text || '';
  }

  async dispose(): Promise<void> {
    if (this.mrzWorker) {
      const w = await this.mrzWorker;
      await w.terminate();
      this.mrzWorker = null;
    }
    if (this.visualWorker) {
      const w = await this.visualWorker;
      await w.terminate();
      this.visualWorker = null;
    }
  }
}
