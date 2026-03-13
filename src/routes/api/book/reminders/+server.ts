import { json, type RequestHandler } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { categories, sections, fields, values, records } from '$lib/server/schema';
import { eq, and, isNull } from 'drizzle-orm';

interface Reminder {
	fieldName: string;
	value: string;
	dateValue: string;
	status: 'expired' | 'soon' | 'upcoming';
	daysUntil: number;
	categorySlug: string;
	categoryName: string;
	sectionSlug: string;
	sectionName: string;
	context: string; // e.g. the "who" or first field value for context
}

export const GET: RequestHandler = async () => {
	const db = getDb();
	const now = new Date();
	const reminders: Reminder[] = [];

	// Find all date-type fields
	const dateFields = db
		.select({
			fieldId: fields.id,
			fieldName: fields.name,
			fieldSlug: fields.slug,
			sectionId: fields.sectionId
		})
		.from(fields)
		.where(eq(fields.fieldType, 'date'))
		.all();

	// Filter to fields that suggest expiration (not birth dates, not "from" dates)
	const expirationSlugs = dateFields.filter((f) => {
		const s = f.fieldSlug;
		return (
			s.includes('expir') ||
			s.includes('due') ||
			s.includes('final-payment') ||
			s.includes('renewal') ||
			s === 'to' ||
			s === 'date'
		);
	});

	// Cache
	const sectionCache = new Map<number, { slug: string; name: string; categoryId: number; type: string }>();
	const categoryCache = new Map<number, { slug: string; name: string }>();

	for (const df of expirationSlugs) {
		// Get all values for this field
		const allValues = db
			.select()
			.from(values)
			.where(eq(values.fieldId, df.fieldId))
			.all();

		for (const v of allValues) {
			if (!v.value) continue;

			const dateVal = new Date(v.value);
			if (isNaN(dateVal.getTime())) continue;

			const diffMs = dateVal.getTime() - now.getTime();
			const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

			// Only care about expired or within 90 days
			if (diffDays > 90) continue;

			let sec = sectionCache.get(df.sectionId);
			if (!sec) {
				const s = db.select().from(sections).where(eq(sections.id, df.sectionId)).get();
				if (!s) continue;
				sec = { slug: s.slug, name: s.name, categoryId: s.categoryId, type: s.type };
				sectionCache.set(df.sectionId, sec);
			}

			let cat = categoryCache.get(sec.categoryId);
			if (!cat) {
				const c = db.select().from(categories).where(eq(categories.id, sec.categoryId)).get();
				if (!c) continue;
				cat = { slug: c.slug, name: c.name };
				categoryCache.set(sec.categoryId, cat);
			}

			// Get context (first field value of the record, or section name)
			let context = sec.name;
			if (v.recordId) {
				const sectionFields = db
					.select()
					.from(fields)
					.where(eq(fields.sectionId, df.sectionId))
					.orderBy(fields.sortOrder)
					.limit(1)
					.all();
				if (sectionFields.length > 0) {
					const firstVal = db
						.select()
						.from(values)
						.where(and(eq(values.fieldId, sectionFields[0].id), eq(values.recordId, v.recordId)))
						.get();
					if (firstVal?.value) context = firstVal.value;
				}
			}

			reminders.push({
				fieldName: df.fieldName,
				value: v.value,
				dateValue: v.value,
				status: diffDays < 0 ? 'expired' : diffDays <= 30 ? 'soon' : 'upcoming',
				daysUntil: diffDays,
				categorySlug: cat.slug,
				categoryName: cat.name,
				sectionSlug: sec.slug,
				sectionName: sec.name,
				context
			});
		}
	}

	// Sort: expired first, then by days until
	reminders.sort((a, b) => a.daysUntil - b.daysUntil);

	return json({ reminders });
};
