import type { PageServerLoad } from './$types';
import { getDb } from '$lib/server/db';
import { emergencyTokens, categories, sections, fields, records, values } from '$lib/server/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import { getEncryptionKey } from '$lib/server/encryption-session';
import { decrypt, isEncrypted } from '$lib/server/crypto';

function decryptValue(val: string | null | undefined): string {
	if (!val) return '';
	const key = getEncryptionKey();
	if (key && isEncrypted(val)) return decrypt(val, key);
	if (isEncrypted(val)) return '[encrypted]';
	return val;
}

export const load: PageServerLoad = async ({ params }) => {
	const db = getDb();

	// Validate token
	const token = db
		.select()
		.from(emergencyTokens)
		.where(eq(emergencyTokens.token, params.token))
		.get();

	if (!token) throw error(404, 'Invalid or expired access link');
	if (token.expiresAt && new Date(token.expiresAt) < new Date()) {
		throw error(403, 'This access link has expired');
	}

	// Load all data (same as print page but read-only)
	const allCategories = db.select().from(categories).orderBy(categories.sortOrder).all();

	const data = allCategories.map((cat) => {
		const allSections = db
			.select()
			.from(sections)
			.where(eq(sections.categoryId, cat.id))
			.orderBy(sections.sortOrder)
			.all();

		const secs = allSections
			.filter((s) => s.type !== 'placeholder')
			.map((sec) => {
				const allFields = db
					.select()
					.from(fields)
					.where(eq(fields.sectionId, sec.id))
					.orderBy(fields.sortOrder)
					.all();

				if (sec.type === 'key_value') {
					const kvData = allFields.map((f) => {
						const val = db
							.select()
							.from(values)
							.where(and(eq(values.fieldId, f.id), isNull(values.recordId)))
							.get();
						return {
							name: f.name,
							value: f.sensitive ? '[hidden]' : decryptValue(val?.value),
							sensitive: f.sensitive
						};
					});
					return { ...sec, fields: allFields, keyValues: kvData, records: [] };
				}

				const allRecords = db
					.select()
					.from(records)
					.where(eq(records.sectionId, sec.id))
					.orderBy(records.sortOrder)
					.all();

				const recs = allRecords.map((r) => {
					const rowValues: Record<number, string> = {};
					for (const f of allFields) {
						const val = db
							.select()
							.from(values)
							.where(and(eq(values.fieldId, f.id), eq(values.recordId, r.id)))
							.get();
						rowValues[f.id] = f.sensitive ? '[hidden]' : decryptValue(val?.value);
					}
					return { id: r.id, values: rowValues };
				});

				const nonEmpty = recs.filter((r) =>
					Object.values(r.values).some((v) => v.trim() !== '' && v !== '[hidden]')
				);

				return { ...sec, fields: allFields, keyValues: [], records: nonEmpty };
			});

		return { ...cat, sections: secs };
	});

	return { emergencyData: data, tokenName: token.name };
};
