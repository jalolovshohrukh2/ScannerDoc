export type OcrMode = 'mrz' | 'visual';

export interface OcrEngine {
  extractText(image: Buffer, mode: OcrMode): Promise<string>;
  dispose?(): Promise<void>;
}
