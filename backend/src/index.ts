import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { LocalFileStorage } from './services/storage/LocalFileStorage';
import { TesseractEngine } from './services/ocr/TesseractEngine';
import { GoogleVisionEngine } from './services/ocr/GoogleVisionEngine';
import type { OcrEngine } from './services/ocr/OcrEngine';
import { DocumentScanService } from './services/documentScan';
import { documentsRouter } from './routes/documents';
import { clientsRouter } from './routes/clients';
import { contractsRouter } from './routes/contracts';
import { getDb } from './db/db';

const PORT = parseInt(process.env.PORT || '4000', 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';
const UPLOAD_TOKEN = process.env.UPLOAD_TOKEN || 'dev-local-token-change-me';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

function createOcrEngine(): { engine: OcrEngine; name: string } {
  const which = (process.env.OCR_ENGINE || 'tesseract').toLowerCase();
  if (which === 'google') {
    const key = process.env.GOOGLE_VISION_API_KEY;
    if (!key) {
      throw new Error(
        'OCR_ENGINE=google but GOOGLE_VISION_API_KEY is not set. Get one at https://console.cloud.google.com/ (enable Cloud Vision API) and put it in backend/.env.',
      );
    }
    console.log('[scannerdoc] OCR engine: Google Cloud Vision');
    return { engine: new GoogleVisionEngine(key), name: 'google' };
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
  app.use(cors({ origin: CORS_ORIGIN, credentials: false }));
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
    console.log(`[scannerdoc] backend listening on http://localhost:${PORT}`);
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
