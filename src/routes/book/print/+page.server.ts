import type { PageServerLoad } from './$types';
import { getDb } from '$lib/server/db';
import { categories, sections, fields, records, values } from '$lib/server/schema';
import { eq, and, isNull } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	const db = getDb();

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
						return { name: f.name, value: val?.value || '', sensitive: f.sensitive };
					});
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
					for (const f of allFields) {
						const val = db
							.select()
							.from(values)
							.where(and(eq(values.fieldId, f.id), eq(values.recordId, r.id)))
							.get();
						rowValues[f.id] = val?.value || '';
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
