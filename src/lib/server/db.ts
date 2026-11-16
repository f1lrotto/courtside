import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const path = resolve(process.env.DATABASE_PATH ?? 'data/padel.db');
mkdirSync(dirname(path), { recursive: true });

export const db = new DatabaseSync(path);

db.exec(`
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;

-- Users, sessions and passwords live in Better Auth's tables ("user", session, account,
-- verification), created by migrateAuth() at startup.

CREATE TABLE IF NOT EXISTS invites (
	email TEXT PRIMARY KEY COLLATE NOCASE,
	role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
	invited_by INTEGER REFERENCES "user"(id) ON DELETE SET NULL,
	created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS availability (
	user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
	date TEXT NOT NULL,
	slot INTEGER NOT NULL,
	PRIMARY KEY (user_id, date, slot)
);

CREATE TABLE IF NOT EXISTS courts (
	venue TEXT NOT NULL,
	court_id TEXT NOT NULL,
	name TEXT NOT NULL,
	kind TEXT NOT NULL CHECK (kind IN ('doubles', 'singles')),
	sort INTEGER NOT NULL,
	PRIMARY KEY (venue, court_id)
);

CREATE TABLE IF NOT EXISTS court_blocks (
	venue TEXT NOT NULL,
	court_id TEXT NOT NULL,
	date TEXT NOT NULL,
	slot INTEGER NOT NULL,
	available INTEGER NOT NULL,
	price REAL,
	PRIMARY KEY (venue, court_id, date, slot)
);

CREATE TABLE IF NOT EXISTS court_pages (
	venue TEXT NOT NULL,
	date TEXT NOT NULL,
	fetched_at TEXT,
	attempted_at TEXT NOT NULL,
	error TEXT,
	PRIMARY KEY (venue, date)
);
`);

export function tx<T>(fn: () => T): T {
	db.exec('BEGIN IMMEDIATE');
	try {
		const result = fn();
		db.exec('COMMIT');
		return result;
	} catch (e) {
		db.exec('ROLLBACK');
		throw e;
	}
}
