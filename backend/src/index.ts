import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { LocalFileStorage } from './services/storage/LocalFileStorage';
import { TesseractEngine } from './services/ocr/TesseractEngine';
import { GoogleVisionEngine } from './services/ocr/GoogleVisionEngine';
import { OcrSpaceEngine } from './services/ocr/OcrSpaceEngine';
import type { OcrEngine } from './services/ocr/OcrEngine';
import { DocumentScanService } from './services/documentScan';
import { documentsRouter } from './routes/documents';
import { clientsRouter } from './routes/clients';
import { contractsRouter } from './routes/contracts';
import { getDb } from './db/db';

const PORT = parseInt(process.env.PORT || '4000', 10);
const IS_PROD = process.env.NODE_ENV === 'production';

const CORS_ORIGINS = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const UPLOAD_TOKEN = process.env.UPLOAD_TOKEN || (IS_PROD ? '' : 'dev-local-token-change-me');
if (IS_PROD && !UPLOAD_TOKEN) {
  throw new Error('UPLOAD_TOKEN must be set in production');
}

const UPLOADS_DIR = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(process.cwd(), 'uploads');

function corsCheck(origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) {
  if (!origin) return cb(null, true);
  if (CORS_ORIGINS.includes('*') || CORS_ORIGINS.includes(origin)) return cb(null, true);
  cb(new Error(`CORS: origin ${origin} not allowed`));
}

function createOcrEngine(): { engine: OcrEngine; name: string } {
  const which = (process.env.OCR_ENGINE || 'tesseract').toLowerCase();
  if (which === 'google') {
    const key = process.env.GOOGLE_VISION_API_KEY;
    if (!key) {
      throw new Error(
        'OCR_ENGINE=google but GOOGLE_VISION_API_KEY is not set. Get one at https://console.cloud.google.com/ (enable Cloud Vision API) and put it in your environment.',
      );
    }
    console.log('[scannerdoc] OCR engine: Google Cloud Vision');
    return { engine: new GoogleVisionEngine(key), name: 'google' };
  }
  if (which === 'ocrspace') {
    const key = process.env.OCR_SPACE_API_KEY || 'helloworld';
    if (key === 'helloworld') {
      console.warn(
        '[scannerdoc] OCR_SPACE_API_KEY not set — using the public "helloworld" key. Get a free one at https://ocr.space/ocrapi/freekey (no card required, 25k/month).',
      );
    }
    console.log('[scannerdoc] OCR engine: OCR.space');
    return { engine: new OcrSpaceEngine({ apiKey: key }), name: 'ocrspace' };
  }
  console.log('[scannerdoc] OCR engine: Tesseract');
  return { engine: new TesseractEngine(), name: 'tesseract' };
}

async function main() {
  getDb();

  const { engine: ocr, name: engineName } = createOcrEngine();
  const storage = new LocalFileStorage(UPLOADS_DIR, '/uploads');
  const scanner = new DocumentScanService(ocr, storage, engineName);

  const app = express();
  app.use(cors({ origin: corsCheck, credentials: false }));
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => res.json({ ok: true }));

  app.get('/uploads/:id', async (req, res) => {
    const token =
      (req.query.token as string | undefined) ||
      (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (token !== UPLOAD_TOKEN) {
      return res.status(401).send('unauthorized');
    }
    const resolved = await storage.resolve(req.params.id);
    if (!resolved) return res.status(404).send('not found');
    res.setHeader('Content-Type', resolved.contentType);
    res.setHeader('Cache-Control', 'private, max-age=60');
    res.sendFile(resolved.absolutePath);
  });

  app.get('/config', (_req, res) => {
    res.json({ uploadToken: UPLOAD_TOKEN });
  });

  app.use('/api/documents', documentsRouter(scanner));
  app.use('/api/clients', clientsRouter());
  app.use('/api/contracts', contractsRouter());

  app.listen(PORT, () => {
    console.log(`[scannerdoc] backend listening on :${PORT}`);
    console.log(`[scannerdoc] uploads dir: ${UPLOADS_DIR}`);
    console.log(`[scannerdoc] CORS allowed: ${CORS_ORIGINS.join(', ')}`);
  });

  const shutdown = async () => {
    console.log('[scannerdoc] shutting down');
    try {
      await ocr.dispose?.();
    } catch (e) {
      console.warn(e);
    }
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('[scannerdoc] fatal', err);
  process.exit(1);
});
