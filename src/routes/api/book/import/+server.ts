import { json, error, type RequestHandler } from '@sveltejs/kit';
import { getDb, resetDb } from '$lib/server/db';
import { categories, sections, fields, records, values, uploads } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { writeFileSync, copyFileSync } from 'fs';

export const POST: RequestHandler = async ({ request, url }) => {
	const format = url.searchParams.get('format');

	if (format === 'sqlite') {
		return importSqlite(request);
	}

	return importJson(request);
};

async function importSqlite(request: Request) {
	const dbPath = env.BOOK_DB_PATH;
	if (!dbPath) throw error(500, 'Database path not configured');

	const buffer = Buffer.from(await request.arrayBuffer());

	// Validate it's a SQLite file (magic bytes: "SQLite format 3\0")
	const magic = buffer.slice(0, 16).toString('ascii');
	if (!magic.startsWith('SQLite format 3')) {
		throw error(400, 'Invalid SQLite database file');
	}

	// Create backup of current DB before replacing
	try {
		copyFileSync(dbPath, dbPath + '.bak');
	} catch {
		// No existing DB to back up
	}

	// Close existing connection and write new file
	resetDb();
	writeFileSync(dbPath, buffer);

	// Re-initialize (runs migrations + seed)
	getDb();

	return json({ success: true, message: 'Database restored from SQLite backup' });
}

async function importJson(request: Request) {
	const data = await request.json();

	if (!data.categories || !Array.isArray(data.categories)) {
		throw error(400, 'Invalid backup format: missing categories array');
	}

	const db = getDb();

	// Clear all existing data (uploads → values → records → fields → sections → categories)
	db.delete(uploads).run();
	db.delete(values).run();
	db.delete(records).run();
	db.delete(fields).run();
	db.delete(sections).run();
	db.delete(categories).run();

	// Import categories
	for (const cat of data.categories) {
		const catResult = db.insert(categories).values({
			name: cat.name,
			slug: cat.slug,
			icon: cat.icon || 'folder',
			sortOrder: cat.sortOrder || 0,
			seeded: cat.seeded || 0
		}).returning().get();

		if (!cat.sections) continue;

		for (const sec of cat.sections) {
			const secResult = db.insert(sections).values({
				categoryId: catResult.id,
				name: sec.name,
				slug: sec.slug,
				type: sec.type || 'key_value',
				sortOrder: sec.sortOrder || 0,
				description: sec.description || null,
				seeded: sec.seeded || 0
			}).returning().get();

			if (!sec.fields) continue;

			// Build field slug → id map for value restoration
			const fieldMap: Record<string, number> = {};
			for (const f of sec.fields) {
				const fieldResult = db.insert(fields).values({
					sectionId: secResult.id,
					name: f.name,
					slug: f.slug,
					fieldType: f.fieldType || 'text',
					sortOrder: f.sortOrder || 0,
					sensitive: f.sensitive || 0
				}).returning().get();
				fieldMap[f.slug] = fieldResult.id;
			}

			// Restore key-value entries
			if (sec.keyValues) {
				for (const kv of sec.keyValues) {
					if (kv.value !== null && kv.value !== undefined && fieldMap[kv.fieldSlug]) {
						db.insert(values).values({
							fieldId: fieldMap[kv.fieldSlug],
							recordId: null,
							value: String(kv.value)
						}).run();
					}
				}
			}

			// Restore uploads for placeholder sections
			if (sec.uploads) {
				for (const u of sec.uploads) {
					db.insert(uploads).values({
						sectionId: secResult.id,
						filename: u.filename,
						mimeType: u.mimeType,
						size: u.size,
						data: u.data,
						uploadedAt: u.uploadedAt
					}).run();
				}
			}

			// Restore table records
			if (sec.records) {
				for (const rec of sec.records) {
					const recResult = db.insert(records).values({
						sectionId: secResult.id,
						sortOrder: rec.sortOrder || 0
					}).returning().get();

					if (rec.values) {
						for (const v of rec.values) {
							if (v.value !== null && v.value !== undefined && fieldMap[v.fieldSlug]) {
								db.insert(values).values({
									fieldId: fieldMap[v.fieldSlug],
									recordId: recResult.id,
									value: String(v.value)
								}).run();
							}
						}
					}
				}
			}
		}
	}

	return json({ success: true, message: 'Data restored from JSON backup' });
}
