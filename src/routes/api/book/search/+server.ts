import { json, type RequestHandler } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { categories, sections, fields, values, records } from '$lib/server/schema';
import { eq, like, and, isNull } from 'drizzle-orm';

export const GET: RequestHandler = async ({ url }) => {
	const q = url.searchParams.get('q')?.trim();
	if (!q || q.length < 2) return json({ results: [] });

	const db = getDb();
	const pattern = `%${q}%`;

	// Search values table, join back to get context
	const matchingValues = db
		.select({
			valueId: values.id,
			value: values.value,
			fieldId: values.fieldId,
			recordId: values.recordId,
			fieldName: fields.name,
			fieldSlug: fields.slug,
			sectionId: fields.sectionId
		})
		.from(values)
		.innerJoin(fields, eq(fields.id, values.fieldId))
		.where(like(values.value, pattern))
		.limit(50)
		.all();

	// Build results with full path info
	const results: {
		fieldName: string;
		value: string;
		categorySlug: string;
		categoryName: string;
		sectionSlug: string;
		sectionName: string;
	}[] = [];

	// Cache section/category lookups
	const sectionCache = new Map<number, { slug: string; name: string; categoryId: number }>();
	const categoryCache = new Map<number, { slug: string; name: string }>();

	for (const match of matchingValues) {
		if (!match.value) continue;

		let sec = sectionCache.get(match.sectionId);
		if (!sec) {
			const s = db.select().from(sections).where(eq(sections.id, match.sectionId)).get();
			if (!s) continue;
			sec = { slug: s.slug, name: s.name, categoryId: s.categoryId };
			sectionCache.set(match.sectionId, sec);
		}

		let cat = categoryCache.get(sec.categoryId);
		if (!cat) {
			const c = db.select().from(categories).where(eq(categories.id, sec.categoryId)).get();
			if (!c) continue;
			cat = { slug: c.slug, name: c.name };
			categoryCache.set(sec.categoryId, cat);
		}

		results.push({
			fieldName: match.fieldName,
			value: match.value,
			categorySlug: cat.slug,
			categoryName: cat.name,
			sectionSlug: sec.slug,
			sectionName: sec.name
		});
	}

	// Also search section names
	const matchingSections = db
		.select({
			sectionName: sections.name,
			sectionSlug: sections.slug,
			categoryId: sections.categoryId
		})
		.from(sections)
		.where(like(sections.name, pattern))
		.limit(10)
		.all();

	for (const sec of matchingSections) {
		let cat = categoryCache.get(sec.categoryId);
		if (!cat) {
			const c = db.select().from(categories).where(eq(categories.id, sec.categoryId)).get();
			if (!c) continue;
			cat = { slug: c.slug, name: c.name };
			categoryCache.set(sec.categoryId, cat);
		}

		results.push({
			fieldName: '(section)',
			value: sec.sectionName,
			categorySlug: cat.slug,
			categoryName: cat.name,
			sectionSlug: sec.slug,
			sectionName: sec.sectionName
		});
	}

	return json({ results: results.slice(0, 30) });
};
