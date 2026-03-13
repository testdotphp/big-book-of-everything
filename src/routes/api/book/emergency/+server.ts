import { json, error, type RequestHandler } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { emergencyTokens } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import { randomBytes } from 'crypto';

// GET: list tokens
export const GET: RequestHandler = async () => {
	const db = getDb();
	const tokens = db.select().from(emergencyTokens).all();
	return json({
		tokens: tokens.map((t) => ({
			id: t.id,
			name: t.name,
			token: t.token,
			expiresAt: t.expiresAt,
			createdAt: t.createdAt,
			expired: t.expiresAt ? new Date(t.expiresAt) < new Date() : false
		}))
	});
};

// POST: create token
export const POST: RequestHandler = async ({ request }) => {
	const db = getDb();
	const { name, expiresInDays } = await request.json();

	if (!name) throw error(400, 'Name required');

	const token = randomBytes(32).toString('hex');
	const expiresAt = expiresInDays
		? new Date(Date.now() + expiresInDays * 86400000).toISOString()
		: null;

	const result = db
		.insert(emergencyTokens)
		.values({
			token,
			name,
			expiresAt,
			createdAt: new Date().toISOString()
		})
		.returning()
		.get();

	return json(result);
};

// DELETE: revoke token
export const DELETE: RequestHandler = async ({ url }) => {
	const db = getDb();
	const id = Number(url.searchParams.get('id'));
	if (!id) throw error(400, 'Token ID required');

	db.delete(emergencyTokens).where(eq(emergencyTokens.id, id)).run();
	return json({ success: true });
};
