import type { OcrEngine } from './ocr/OcrEngine';
import type { FileStorage } from './storage/FileStorage';
import { extractMrzLines, parseMrz } from './mrz/parseMrz';
import { parseVisualText, EMPTY_SUGGESTED } from './visual/parseVisualText';
import type { DocType, ScannedDocument, ScanWarning } from '../types/ScannedDocument';

export interface ScanInput {
  front: { buffer: Buffer; originalName: string; mimeType: string };
  back?: { buffer: Buffer; originalName: string; mimeType: string };
  docType?: DocType;
}

export interface DocumentScanner {
  scan(input: ScanInput): Promise<ScannedDocument>;
}

export class DocumentScanService implements DocumentScanner {
  constructor(
    private ocr: OcrEngine,
    private storage: FileStorage,
    private engineName: string = 'tesseract',
  ) {}

  async scan(input: ScanInput): Promise<ScannedDocument> {
    const frontStored = await this.storage.save(
      input.front.buffer,
      input.front.originalName,
      input.front.mimeType,
    );
    const backStored = input.back
      ? await this.storage.save(input.back.buffer, input.back.originalName, input.back.mimeType)
      : null;

    const isNationalId = input.docType === 'national_id';
    const mrzSourceBuffer = isNationalId && input.back ? input.back.buffer : input.front.buffer;

    const mrzText = await this.ocr.extractText(mrzSourceBuffer, 'mrz');
    if (process.env.SCAN_DEBUG === '1') {
      console.log('[scan] MRZ OCR text:\n' + mrzText);
    }

    // Visual side(s). For national_id we OCR both front (photo + visual fields)
    // and back (issuing authority etc.) and concatenate. For passport everything
    // is on the front data page — same buffer as MRZ — so just reuse.
    let visualText = '';
    if (isNationalId) {
      const frontVisualText = await this.ocr.extractText(input.front.buffer, 'visual');
      const backVisualText = input.back
        ? await this.ocr.extractText(input.back.buffer, 'visual')
        : '';
      visualText = backVisualText
        ? `${frontVisualText}\n---\n${backVisualText}`
        : frontVisualText;
    } else {
      // Passport: visual = MRZ source. Avoid a redundant call when possible.
      visualText = mrzText && mrzText.length > 100 ? mrzText : await this.ocr.extractText(input.front.buffer, 'visual');
    }
    if (process.env.SCAN_DEBUG === '1') {
      console.log('[scan] visual OCR text:\n' + visualText);
    }

    const suggestedManual = visualText ? parseVisualText(visualText) : EMPTY_SUGGESTED;

    const extracted = extractMrzLines(mrzText, input.docType);

    if (!extracted) {
      return {
        docType: input.docType || 'passport',
        fields: {
          surname: '',
          givenNames: '',
          documentNumber: '',
          nationality: '',
          dateOfBirth: '',
          sex: '',
          expiryDate: '',
        },
        warnings: [
          {
            field: 'mrz',
            message:
              'Could not locate a Machine Readable Zone. Re-capture with the MRZ flat, well-lit, and in focus.',
          },
        ],
        images: {
          frontUrl: frontStored.url,
          backUrl: backStored?.url,
        },
        rawMrz: [],
        visualText,
        suggestedManual,
        ocrEngine: this.engineName,
      };
    }

    const parsed = parseMrz(extracted.lines, extracted.format);

    const warnings: ScanWarning[] = [...parsed.warnings];
    if (input.docType && input.docType !== parsed.detectedDocType) {
      warnings.push({
        field: 'docType',
        message: `Expected ${input.docType} but detected ${parsed.detectedDocType} based on MRZ format.`,
      });
    }

    return {
      docType: parsed.detectedDocType,
      fields: parsed.fields,
      warnings,
      images: {
        frontUrl: frontStored.url,
        backUrl: backStored?.url,
      },
      rawMrz: parsed.rawMrz,
      visualText,
      suggestedManual,
      ocrEngine: this.engineName,
    };
  }
}
