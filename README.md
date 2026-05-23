# ScannerDoc

Document scanner for Tajik & Uzbek passports + national ID cards.
Extraction only — staff review and correct every field before saving.

Stack: React + TypeScript (Vite) frontend, Node + Express + TypeScript backend,
[`mrz`](https://www.npmjs.com/package/mrz) for MRZ parsing,
[`tesseract.js`](https://www.npmjs.com/package/tesseract.js) for OCR (behind a
swappable `OcrEngine` interface), sqlite (better-sqlite3) for storage.

## Run

```powershell
copy .env.example backend\.env
npm install
npm run dev   # backend on :4000, frontend on :5173
```

Open http://localhost:5173.

- **/scanner** — standalone test page. Pick passport or national ID, capture
  or upload, see the returned `ScannerResult` JSON.
- **/clients/new** — Add Client. Scan → review → save to sqlite.
- **/contracts/new** — Add Contract. Either scan a fresh doc or pick an
  existing client.

## Document formats

- Passport: TD3 MRZ (2 × 44) on the data page. Single image.
- National ID: TD1 MRZ (3 × 30) on the **back**. Two images required.

The MRZ gives you: surname, given names, document number, nationality, DOB, sex,
expiry, document type. Patronymic, address, issuing authority and Cyrillic
spellings are **not** in the MRZ — the review form has them empty and editable.

## Architecture

```
backend/
  src/
    routes/documents.ts              POST /api/documents/scan  (model-agnostic)
    routes/clients.ts                /api/clients
    routes/contracts.ts              /api/contracts
    services/
      ocr/OcrEngine.ts               <-- swappable
      ocr/TesseractEngine.ts         <-- replace this to swap OCR
      mrz/parseMrz.ts                wraps `mrz` package
      documentScan.ts                orchestrator
      storage/LocalFileStorage.ts    writes to ./uploads
    db/db.ts                         better-sqlite3, file ./data.sqlite

frontend/
  src/
    components/DocumentScanner/      reusable; model-agnostic
      DocumentScanner.tsx
      CaptureStep.tsx                camera + file upload (passport=1, NID=2)
      ReviewStep.tsx                 editable form, manual fields grouped
    pages/
      ScannerTestPage.tsx
      AddClientPage.tsx
      AddContractPage.tsx
```

## Swapping the OCR engine

`backend/src/services/ocr/OcrEngine.ts` is the seam:

```ts
export type OcrMode = 'mrz' | 'visual';
export interface OcrEngine {
  extractText(image: Buffer, mode: OcrMode): Promise<string>;
  dispose?(): Promise<void>;
}
```

Two engines ship in the box, selected with `OCR_ENGINE` in `backend/.env`:

- `OCR_ENGINE=tesseract` (default) — offline, free. Uses tesseract.js with a
  dedicated MRZ worker (OCR-B charset whitelist, multi-rotation, multi-preprocess
  voting, check-digit-aware error correction) and a visual worker (rus+eng for
  Cyrillic).
- `OCR_ENGINE=google` — requires `GOOGLE_VISION_API_KEY`. Calls Google Cloud
  Vision's `DOCUMENT_TEXT_DETECTION` endpoint. ~99% accuracy on real phone
  photos; ~$1.50 per 1000 scans (first 1000/month free).
  Enable Cloud Vision API at https://console.cloud.google.com/, create an API
  key, paste it into `.env`.

To add a third engine (a commercial SDK, PaddleOCR sidecar, etc.), implement
`OcrEngine` and add a case to `createOcrEngine()` in `backend/src/index.ts` —
nothing else changes.

## What's returned

The scan response includes:

- `fields` — MRZ-derived data, every field editable on the review screen.
- `warnings[]` — check-digit failures, parse issues, and any auto-corrections
  that were applied (e.g. `Z → 2` to make a check digit validate).
- `visualText` — raw OCR text from the visual side of the document (Cyrillic +
  Latin). Staff can copy-paste from this into manual fields.
- `images.frontUrl` / `images.backUrl` — token-gated URLs to the stored images.
- `ocrEngine` — which engine produced the result.

## Image storage

Images persist in `backend/uploads/` and are referenced by URL in the response.
They are served from `/uploads/:id` behind a bearer token (`UPLOAD_TOKEN` in
`backend/.env`) — not real auth, but not publicly listable either. Replace with
real session auth when integrating into a production app.

## Deploying

Recommended split: **frontend on Vercel, backend on Railway**. Vercel is great
at static React; Railway is the right shape for a long-running Node service
that needs a real filesystem (uploads + sqlite). Don't try to host the backend
on Vercel — it's serverless, has no persistent disk, and our Tesseract worker
+ better-sqlite3 + sharp don't fit that runtime well.

### Backend → Railway

1. Sign up at https://railway.app and create a **New Project → Deploy from
   GitHub repo → ScannerDoc**.
2. Railway auto-detects Node and uses the root `Procfile` (`web: npm run
   start:backend`). The default build runs `npm install && npm run build`.
3. **Add a Volume** (Service Settings → Volumes) and mount at `/data`. This
   gives you persistent storage for uploaded images and the sqlite file across
   deploys.
4. **Variables** (Service Settings → Variables):
   - `NODE_ENV` = `production`
   - `UPLOAD_TOKEN` = a long random string (e.g. from `openssl rand -hex 32`)
   - `CORS_ORIGIN` = your Vercel URL (set after Vercel deploy, e.g.
     `https://scannerdoc.vercel.app`)
   - `OCR_ENGINE` = `google`
   - `GOOGLE_VISION_API_KEY` = your Cloud Vision key
   - `UPLOADS_DIR` = `/data/uploads`
   - `DB_PATH` = `/data/data.sqlite`
5. Railway sets `PORT` automatically — don't override.
6. Once deployed, copy the public URL (e.g.
   `https://scannerdoc-backend.up.railway.app`). You'll paste it into Vercel
   next.

### Frontend → Vercel

1. Sign up at https://vercel.com and **Import Project** from your GitHub repo.
2. The root `vercel.json` sets install/build commands and output directory.
   **Leave "Root Directory" blank** in Vercel project settings — do NOT set
   it to `frontend`. If you do, Vercel will switch its working directory and
   the workspace install will fail with "No workspaces found".
3. **Environment Variables** (Settings → Environment Variables):
   - `VITE_API_URL` = your Railway backend URL (no trailing slash)
4. Deploy. You'll get a `https://...vercel.app` URL.
5. **Go back to Railway** and update `CORS_ORIGIN` to that Vercel URL, then
   redeploy.

### Verify

- Visit your Vercel URL → `/scanner` → upload a document.
- Browser dev tools → Network tab → calls go to your Railway URL.
- Railway logs (`Service → Deployments → View Logs`) show the OCR request.
- New clients persist across Railway redeploys (sqlite is on the mounted volume).

### Custom domain

Both Vercel and Railway support custom domains. After pointing DNS, update
`CORS_ORIGIN` on Railway and `VITE_API_URL` on Vercel accordingly.
