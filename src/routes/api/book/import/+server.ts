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
	// Check Content-Length before reading body (50MB limit)
	const contentLength = Number(request.headers.get('content-length') || 0);
	if (contentLength > 50 * 1024 * 1024) {
		throw error(413, 'Import file too large (max 50MB)');
	}

	let data: Record<string, unknown>;
	try {
		data = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	if (!data.categories || !Array.isArray(data.categories)) {
		throw error(400, 'Invalid backup format: missing categories array');
	}

	const db = getDb();

	// Wrap entire import in a transaction for atomicity
	const importTransaction = db.transaction(() => {
		// Clear all existing data (uploads → values → records → fields → sections → categories)
		db.delete(uploads).run();
		db.delete(values).run();
		db.delete(records).run();
		db.delete(fields).run();
		db.delete(sections).run();
		db.delete(categories).run();

		// Import categories
		for (const cat of data.categories as Record<string, unknown>[]) {
			const catResult = db.insert(categories).values({
				name: cat.name as string,
				slug: cat.slug as string,
				icon: (cat.icon as string) || 'folder',
				sortOrder: (cat.sortOrder as number) || 0,
				seeded: (cat.seeded as number) || 0
			}).returning().get();

			if (!cat.sections) continue;

			for (const sec of cat.sections as Record<string, unknown>[]) {
				const secResult = db.insert(sections).values({
					categoryId: catResult.id,
					name: sec.name as string,
					slug: sec.slug as string,
					type: (sec.type as string) || 'key_value',
					sortOrder: (sec.sortOrder as number) || 0,
					description: (sec.description as string) || null,
					seeded: (sec.seeded as number) || 0
				}).returning().get();

				if (!sec.fields) continue;

				// Build field slug → id map for value restoration
				const fieldMap: Record<string, number> = {};
				for (const f of sec.fields as Record<string, unknown>[]) {
					const fieldResult = db.insert(fields).values({
						sectionId: secResult.id,
						name: f.name as string,
						slug: f.slug as string,
						fieldType: (f.fieldType as string) || 'text',
						sortOrder: (f.sortOrder as number) || 0,
						sensitive: (f.sensitive as number) || 0
					}).returning().get();
					fieldMap[f.slug as string] = fieldResult.id;
				}

				// Restore key-value entries
				if (sec.keyValues) {
					for (const kv of sec.keyValues as Record<string, unknown>[]) {
						if (kv.value !== null && kv.value !== undefined && fieldMap[kv.fieldSlug as string]) {
							db.insert(values).values({
								fieldId: fieldMap[kv.fieldSlug as string],
								recordId: null,
								value: String(kv.value)
							}).run();
						}
					}
				}

				// Restore uploads for placeholder sections
				if (sec.uploads) {
					for (const u of sec.uploads as Record<string, unknown>[]) {
						db.insert(uploads).values({
							sectionId: secResult.id,
							filename: u.filename as string,
							mimeType: u.mimeType as string,
							size: u.size as number,
							data: u.data as string,
							uploadedAt: u.uploadedAt as string
						}).run();
					}
				}

				// Restore table records
				if (sec.records) {
					for (const rec of sec.records as Record<string, unknown>[]) {
						const recResult = db.insert(records).values({
							sectionId: secResult.id,
							sortOrder: (rec.sortOrder as number) || 0
						}).returning().get();

						if (rec.values) {
							for (const v of rec.values as Record<string, unknown>[]) {
								if (v.value !== null && v.value !== undefined && fieldMap[v.fieldSlug as string]) {
									db.insert(values).values({
										fieldId: fieldMap[v.fieldSlug as string],
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
	});

	importTransaction();

	return json({ success: true, message: 'Data restored from JSON backup' });
}
