import { json, error, type RequestHandler } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { sections } from '$lib/server/schema';
import { eq } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request }) => {
	const db = getDb();
	const { categoryId, name, type } = await request.json();

	if (!name?.trim()) throw error(400, 'Name is required');
	if (!categoryId) throw error(400, 'Category ID is required');

	const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
	const maxOrder = db.select({ max: sections.sortOrder })
		.from(sections).where(eq(sections.categoryId, categoryId)).get();

	const result = db.insert(sections).values({
		categoryId,
		name: name.trim(),
		slug,
		type: type || 'table',
		sortOrder: (maxOrder?.max || 0) + 1,
		seeded: 0
	}).returning().get();

	return json(result);
};

export const DELETE: RequestHandler = async ({ url }) => {
	const db = getDb();
	const id = Number(url.searchParams.get('id'));
	if (!id) throw error(400, 'ID is required');

	const sec = db.select().from(sections).where(eq(sections.id, id)).get();
	if (!sec) throw error(404, 'Section not found');
	if (sec.seeded) throw error(403, 'Cannot delete seeded sections');

	db.delete(sections).where(eq(sections.id, id)).run();
	return json({ success: true });
};
