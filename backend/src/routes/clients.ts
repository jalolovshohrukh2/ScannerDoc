import { Router } from 'express';
import { getDb } from '../db/db';

const STRING_FIELDS = [
  'doc_type',
  'surname',
  'given_names',
  'patronymic',
  'surname_cyr',
  'given_names_cyr',
  'document_number',
  'nationality',
  'date_of_birth',
  'sex',
  'expiry_date',
  'issuing_authority',
  'address',
  'phone',
  'email',
  'front_image_url',
  'back_image_url',
] as const;

function str(v: unknown): string {
  return typeof v === 'string' ? v : v == null ? '' : String(v);
}

export function clientsRouter(): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    const db = getDb();
    const rows = db
      .prepare(
        `SELECT id, doc_type, surname, given_names, document_number, nationality, date_of_birth, created_at
         FROM clients
         ORDER BY id DESC
         LIMIT 200`,
      )
      .all();
    res.json(rows);
  });

  router.get('/:id', (req, res) => {
    const db = getDb();
    const row = db.prepare(`SELECT * FROM clients WHERE id = ?`).get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  });

  router.post('/', (req, res) => {
    const body = (req.body || {}) as Record<string, unknown>;
    if (!str(body.surname) && !str(body.given_names)) {
      return res.status(400).json({ error: 'surname or given_names required' });
    }
    if (!str(body.document_number)) {
      return res.status(400).json({ error: 'document_number required' });
    }

    const values: Record<string, string> = {};
    for (const f of STRING_FIELDS) values[f] = str(body[f]);
    if (!values.doc_type) values.doc_type = 'passport';

    const db = getDb();
    const columns = STRING_FIELDS.join(', ');
    const placeholders = STRING_FIELDS.map((f) => `@${f}`).join(', ');
    const info = db
      .prepare(`INSERT INTO clients (${columns}) VALUES (${placeholders})`)
      .run(values);
    const row = db.prepare(`SELECT * FROM clients WHERE id = ?`).get(info.lastInsertRowid);
    res.status(201).json(row);
  });

  return router;
}
