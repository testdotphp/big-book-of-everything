import { env } from '$env/dynamic/private';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { eq } from 'drizzle-orm';
import * as schema from './schema';
import { resolve } from 'path';
import { readFileSync, existsSync } from 'fs';

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

    // Seed book structure from JSON
    seedBookStructure(db);
  }

  return db;
}

function seedBookStructure(db: ReturnType<typeof drizzle<typeof schema>>) {
  const seedPath = resolve('configs/book-structure.json');
  if (!existsSync(seedPath)) return;

  const seed = JSON.parse(readFileSync(seedPath, 'utf-8'));

  for (const cat of seed.categories) {
    const existing = db.select().from(schema.categories)
      .where(eq(schema.categories.slug, cat.slug)).get();
    if (existing) continue;

    const catResult = db.insert(schema.categories).values({
      name: cat.name, slug: cat.slug, icon: cat.icon, sortOrder: cat.sortOrder
    }).returning().get();

    for (const sec of cat.sections) {
      const secResult = db.insert(schema.sections).values({
        categoryId: catResult.id, name: sec.name, slug: sec.slug,
        type: sec.type, sortOrder: sec.sortOrder, description: sec.description || null
      }).returning().get();

      if (sec.fields) {
        for (const field of sec.fields) {
          db.insert(schema.fields).values({
            sectionId: secResult.id, name: field.name, slug: field.slug,
            fieldType: field.fieldType, sortOrder: field.sortOrder
          }).run();
        }
      }
    }
  }
}
