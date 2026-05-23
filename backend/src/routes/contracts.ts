import { Router } from 'express';
import { getDb } from '../db/db';

const STRING_FIELDS = [
  'title',
  'currency',
  'start_date',
  'end_date',
  'notes',
  'client_doc_type',
  'client_surname',
  'client_given_names',
  'client_document_number',
  'client_nationality',
  'client_date_of_birth',
  'client_sex',
  'client_expiry_date',
  'client_patronymic',
  'client_patronymic_cyr',
  'client_surname_cyr',
  'client_given_names_cyr',
  'client_issuing_authority',
  'client_issuing_authority_cyr',
  'client_address',
  'client_phone',
  'client_email',
  'front_image_url',
  'back_image_url',
] as const;

function str(v: unknown): string {
  return typeof v === 'string' ? v : v == null ? '' : String(v);
}

function num(v: unknown): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : 0;
}

export function contractsRouter(): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    const db = getDb();
    const rows = db
      .prepare(
        `SELECT id, client_id, title, amount, currency, start_date, end_date,
                client_surname, client_given_names, client_document_number, created_at
         FROM contracts
         ORDER BY id DESC
         LIMIT 200`,
      )
      .all();
    res.json(rows);
  });

  router.get('/:id', (req, res) => {
    const db = getDb();
    const row = db.prepare(`SELECT * FROM contracts WHERE id = ?`).get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  });

  router.post('/', (req, res) => {
    const body = (req.body || {}) as Record<string, unknown>;
    if (!str(body.title)) return res.status(400).json({ error: 'title required' });
    if (!str(body.client_document_number) && !body.client_id) {
      return res
        .status(400)
        .json({ error: 'client_document_number or client_id required' });
    }

    const values: Record<string, string | number | null> = {};
    for (const f of STRING_FIELDS) values[f] = str(body[f]);
    values.amount = num(body.amount);
    values.client_id = body.client_id == null || body.client_id === '' ? null : Number(body.client_id);
    if (!values.client_doc_type) values.client_doc_type = 'passport';
    if (!values.currency) values.currency = 'TJS';

    const allFields = ['client_id', 'amount', ...STRING_FIELDS];
    const columns = allFields.join(', ');
    const placeholders = allFields.map((f) => `@${f}`).join(', ');

    const db = getDb();
    const info = db
      .prepare(`INSERT INTO contracts (${columns}) VALUES (${placeholders})`)
      .run(values);
    const row = db.prepare(`SELECT * FROM contracts WHERE id = ?`).get(info.lastInsertRowid);
    res.status(201).json(row);
  });

  return router;
}
