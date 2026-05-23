import Database from 'better-sqlite3';
import path from 'path';

let dbInstance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (dbInstance) return dbInstance;
  const dbPath = process.env.DB_PATH
    ? path.resolve(process.env.DB_PATH)
    : path.join(process.cwd(), 'data.sqlite');
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  migrate(db);
  dbInstance = db;
  return db;
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      doc_type TEXT NOT NULL,
      surname TEXT NOT NULL,
      given_names TEXT NOT NULL,
      patronymic TEXT NOT NULL DEFAULT '',
      surname_cyr TEXT NOT NULL DEFAULT '',
      given_names_cyr TEXT NOT NULL DEFAULT '',
      document_number TEXT NOT NULL,
      nationality TEXT NOT NULL DEFAULT '',
      date_of_birth TEXT NOT NULL DEFAULT '',
      sex TEXT NOT NULL DEFAULT '',
      expiry_date TEXT NOT NULL DEFAULT '',
      issuing_authority TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      front_image_url TEXT NOT NULL DEFAULT '',
      back_image_url TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS contracts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'TJS',
      start_date TEXT NOT NULL DEFAULT '',
      end_date TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      client_doc_type TEXT NOT NULL DEFAULT '',
      client_surname TEXT NOT NULL DEFAULT '',
      client_given_names TEXT NOT NULL DEFAULT '',
      client_document_number TEXT NOT NULL DEFAULT '',
      client_nationality TEXT NOT NULL DEFAULT '',
      client_date_of_birth TEXT NOT NULL DEFAULT '',
      client_sex TEXT NOT NULL DEFAULT '',
      client_expiry_date TEXT NOT NULL DEFAULT '',
      client_patronymic TEXT NOT NULL DEFAULT '',
      client_surname_cyr TEXT NOT NULL DEFAULT '',
      client_given_names_cyr TEXT NOT NULL DEFAULT '',
      client_issuing_authority TEXT NOT NULL DEFAULT '',
      client_address TEXT NOT NULL DEFAULT '',
      client_phone TEXT NOT NULL DEFAULT '',
      client_email TEXT NOT NULL DEFAULT '',
      front_image_url TEXT NOT NULL DEFAULT '',
      back_image_url TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}
