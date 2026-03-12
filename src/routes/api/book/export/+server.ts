import { error, type RequestHandler } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { categories, sections, fields, records, values, uploads } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { readFileSync } from 'fs';

export const GET: RequestHandler = async ({ url }) => {
	const format = url.searchParams.get('format');

	if (format === 'sqlite') {
		return exportSqlite();
	}

	return exportJson();
};

function exportSqlite() {
	const dbPath = env.BOOK_DB_PATH;
	if (!dbPath) throw error(500, 'Database path not configured');

	const fileBuffer = readFileSync(dbPath);
	const timestamp = new Date().toISOString().slice(0, 10);

	return new Response(fileBuffer, {
		headers: {
			'Content-Type': 'application/x-sqlite3',
			'Content-Disposition': `attachment; filename="big-book-backup-${timestamp}.db"`
		}
	});
}

function exportJson() {
	const db = getDb();
	const timestamp = new Date().toISOString().slice(0, 10);

	const allCategories = db.select().from(categories).orderBy(categories.sortOrder).all();

	const data = {
		exportVersion: 1,
		exportDate: new Date().toISOString(),
		categories: allCategories.map((cat) => {
			const allSections = db.select().from(sections)
				.where(eq(sections.categoryId, cat.id))
				.orderBy(sections.sortOrder).all();

			return {
				name: cat.name,
				slug: cat.slug,
				icon: cat.icon,
				sortOrder: cat.sortOrder,
				seeded: cat.seeded,
				sections: allSections.map((sec) => {
					const allFields = db.select().from(fields)
						.where(eq(fields.sectionId, sec.id))
						.orderBy(fields.sortOrder).all();

					const allRecords = db.select().from(records)
						.where(eq(records.sectionId, sec.id))
						.orderBy(records.sortOrder).all();

					const recordsWithValues = allRecords.map((rec) => {
						const allValues = db.select().from(values)
							.where(eq(values.recordId, rec.id)).all();

						return {
							sortOrder: rec.sortOrder,
							values: allValues.map((v) => {
								const field = allFields.find(f => f.id === v.fieldId);
								return {
									fieldSlug: field?.slug || `field-${v.fieldId}`,
									value: v.value
								};
							})
						};
					});

					// Key-value entries (values without a recordId)
					const kvValues = db.select().from(values)
						.where(eq(values.recordId, 0)).all()
						.filter(() => false); // placeholder — KV values have null recordId

					// Get KV values (recordId IS NULL) via raw approach
					const kvEntries = sec.type === 'key_value'
						? allFields.map((f) => {
							const val = db.select().from(values)
								.where(eq(values.fieldId, f.id)).all()
								.find(v => v.recordId === null);
							return { fieldSlug: f.slug, value: val?.value || null };
						})
						: [];

					const allUploads = sec.type === 'placeholder'
						? db.select().from(uploads)
							.where(eq(uploads.sectionId, sec.id)).all()
							.map((u) => ({
								filename: u.filename,
								mimeType: u.mimeType,
								size: u.size,
								data: u.data,
								uploadedAt: u.uploadedAt
							}))
						: [];

					return {
						name: sec.name,
						slug: sec.slug,
						type: sec.type,
						sortOrder: sec.sortOrder,
						description: sec.description,
						seeded: sec.seeded,
						fields: allFields.map((f) => ({
							name: f.name,
							slug: f.slug,
							fieldType: f.fieldType,
							sortOrder: f.sortOrder
						})),
						records: recordsWithValues,
						keyValues: kvEntries,
						uploads: allUploads
					};
				})
			};
		})
	};

	const json = JSON.stringify(data, null, 2);

	return new Response(json, {
		headers: {
			'Content-Type': 'application/json',
			'Content-Disposition': `attachment; filename="big-book-backup-${timestamp}.json"`
		}
	});
}
