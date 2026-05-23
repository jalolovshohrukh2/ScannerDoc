import { Router } from 'express';
import multer from 'multer';
import type { DocumentScanner } from '../services/documentScan';
import type { DocType } from '../types/ScannedDocument';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024, files: 2 },
});

function asDocType(v: unknown): DocType | undefined {
  return v === 'passport' || v === 'national_id' ? v : undefined;
}

export function documentsRouter(scanner: DocumentScanner): Router {
  const router = Router();

  router.post(
    '/scan',
    upload.fields([
      { name: 'front', maxCount: 1 },
      { name: 'back', maxCount: 1 },
    ]),
    async (req, res) => {
      try {
        const files = req.files as Record<string, Express.Multer.File[]> | undefined;
        const front = files?.front?.[0];
        const back = files?.back?.[0];

        if (!front) {
          return res.status(400).json({ error: 'front image is required' });
        }

        const docType = asDocType(req.body?.docType);
        if (docType === 'national_id' && !back) {
          return res
            .status(400)
            .json({ error: 'back image is required for national_id' });
        }

        const result = await scanner.scan({
          front: {
            buffer: front.buffer,
            originalName: front.originalname,
            mimeType: front.mimetype,
          },
          back: back
            ? { buffer: back.buffer, originalName: back.originalname, mimeType: back.mimetype }
            : undefined,
          docType,
        });
        return res.json(result);
      } catch (err: any) {
        console.error('[documents/scan]', err);
        return res.status(500).json({ error: err?.message || 'Scan failed' });
      }
    },
  );

  return router;
}
