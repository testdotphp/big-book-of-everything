import { json, error, type RequestHandler } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { categories } from '$lib/server/schema';
import { eq } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request }) => {
	const db = getDb();
	const { name, icon } = await request.json();

	if (!name?.trim()) throw error(400, 'Name is required');

	const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
	const maxOrder = db.select({ max: categories.sortOrder }).from(categories).get();

	const result = db.insert(categories).values({
		name: name.trim(),
		slug,
		icon: icon || 'folder',
		sortOrder: (maxOrder?.max || 0) + 1,
		seeded: 0
	}).returning().get();

	return json(result);
};

export const DELETE: RequestHandler = async ({ url }) => {
	const db = getDb();
	const id = Number(url.searchParams.get('id'));
	if (!id) throw error(400, 'ID is required');

	// Only allow deleting non-seeded categories
	const cat = db.select().from(categories).where(eq(categories.id, id)).get();
	if (!cat) throw error(404, 'Category not found');
	if (cat.seeded) throw error(403, 'Cannot delete seeded categories');

	db.delete(categories).where(eq(categories.id, id)).run();
	return json({ success: true });
};
