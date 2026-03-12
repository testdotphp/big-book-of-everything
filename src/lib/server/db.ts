import { env } from '$env/dynamic/private';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema';
import { resolve } from 'path';

let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function isBookEnabled(): boolean {
  return !!env.BOOK_DB_PATH;
}

export function getDb() {
  if (!isBookEnabled()) {
    throw new Error('Big Book is not enabled (BOOK_DB_PATH not set)');
  }

  if (!db) {
    const dbPath = env.BOOK_DB_PATH!;
    const sqlite = new Database(dbPath);
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');

    db = drizzle(sqlite, { schema });

    // Run migrations on first connection
    migrate(db, { migrationsFolder: resolve('drizzle') });
  }

  return db;
}
