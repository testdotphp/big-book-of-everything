import type { PageServerLoad } from './$types';
import { getDb } from '$lib/server/db';
import { categories, sections, fields, records, values } from '$lib/server/schema';
import { eq, and, isNull } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	const db = getDb();

	const allCategories = db.select().from(categories).orderBy(categories.sortOrder).all();

	// Batch: load all values at once to avoid N+1 queries
	const allValues = db.select().from(values).all();
	const kvValueMap = new Map<number, string>(); // fieldId → value (for KV with null recordId)
	const recordValueMap = new Map<number, Map<number, string>>(); // recordId → fieldId → value
	for (const v of allValues) {
		if (v.recordId === null) {
			kvValueMap.set(v.fieldId, v.value || '');
		} else {
			if (!recordValueMap.has(v.recordId)) recordValueMap.set(v.recordId, new Map());
			recordValueMap.get(v.recordId)!.set(v.fieldId, v.value || '');
		}
	}

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
					const kvData = allFields.map((f) => ({
						name: f.name,
						value: kvValueMap.get(f.id) || '',
						sensitive: f.sensitive
					}));
					return { ...sec, fields: allFields, keyValues: kvData, records: [] };
				}

				// Table type
				const allRecords = db
					.select()
					.from(records)
					.where(eq(records.sectionId, sec.id))
					.orderBy(records.sortOrder)
					.all();

				const recs = allRecords.map((r) => {
					const rowValues: Record<number, string> = {};
					const rValues = recordValueMap.get(r.id);
					for (const f of allFields) {
						rowValues[f.id] = rValues?.get(f.id) || '';
					}
					return { id: r.id, values: rowValues };
				});

				// Filter out empty records
				const nonEmpty = recs.filter((r) =>
					Object.values(r.values).some((v) => v.trim() !== '')
				);

				return { ...sec, fields: allFields, keyValues: [], records: nonEmpty };
			});

		return { ...cat, sections: secs };
	});

	return { printData: data };
};
