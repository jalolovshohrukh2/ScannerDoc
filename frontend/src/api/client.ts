import type { ScannedDocument, DocType } from '../components/DocumentScanner/types';

// VITE_API_URL is set in production (e.g. https://scannerdoc-backend.up.railway.app).
// In dev, leave it empty so calls go to /api/* and are proxied by Vite to localhost:4000.
const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

function apiUrl(path: string): string {
  return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}

let cachedUploadToken: string | null = null;

export async function getUploadToken(): Promise<string> {
  if (cachedUploadToken) return cachedUploadToken;
  const res = await fetch(apiUrl('/config'));
  if (!res.ok) throw new Error('Failed to load upload token');
  const data = (await res.json()) as { uploadToken: string };
  cachedUploadToken = data.uploadToken;
  return cachedUploadToken;
}

export async function scanDocument(opts: {
  front: Blob;
  back?: Blob | null;
  docType: DocType;
}): Promise<ScannedDocument> {
  const fd = new FormData();
  fd.append('docType', opts.docType);
  fd.append('front', opts.front, 'front.jpg');
  if (opts.back) fd.append('back', opts.back, 'back.jpg');
  const res = await fetch(apiUrl('/api/documents/scan'), { method: 'POST', body: fd });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Scan failed (${res.status}): ${text}`);
  }
  return (await res.json()) as ScannedDocument;
}

export async function withUploadToken(url: string): Promise<string> {
  if (!url.startsWith('/uploads/')) return url;
  const token = await getUploadToken();
  const sep = url.includes('?') ? '&' : '?';
  return `${apiUrl(url)}${sep}token=${encodeURIComponent(token)}`;
}

export interface ClientRow {
  id: number;
  doc_type: string;
  surname: string;
  given_names: string;
  document_number: string;
  nationality: string;
  date_of_birth: string;
  created_at: string;
}

export async function listClients(): Promise<ClientRow[]> {
  const res = await fetch(apiUrl('/api/clients'));
  if (!res.ok) throw new Error('Failed to load clients');
  return (await res.json()) as ClientRow[];
}

export async function createClient(payload: Record<string, unknown>): Promise<{ id: number }> {
  const res = await fetch(apiUrl('/api/clients'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Save client failed: ${text}`);
  }
  return (await res.json()) as { id: number };
}

export interface ContractRow {
  id: number;
  client_id: number | null;
  title: string;
  amount: number;
  currency: string;
  start_date: string;
  end_date: string;
  client_surname: string;
  client_given_names: string;
  client_document_number: string;
  created_at: string;
}

export async function listContracts(): Promise<ContractRow[]> {
  const res = await fetch(apiUrl('/api/contracts'));
  if (!res.ok) throw new Error('Failed to load contracts');
  return (await res.json()) as ContractRow[];
}

export async function createContract(payload: Record<string, unknown>): Promise<{ id: number }> {
  const res = await fetch(apiUrl('/api/contracts'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Save contract failed: ${text}`);
  }
  return (await res.json()) as { id: number };
}
