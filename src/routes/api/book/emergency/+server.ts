import { json, error, type RequestHandler } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { emergencyTokens } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import { randomBytes } from 'crypto';

function requireAuth(event: { locals: App.Locals }) {
	// This endpoint is protected by the layout auth redirect, but verify explicitly
	if (!event.locals.auth) throw error(401, 'Authentication required');
}

// GET: list tokens
export const GET: RequestHandler = async (event) => {
	requireAuth(event);
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
export const POST: RequestHandler = async (event) => {
	requireAuth(event);
	const db = getDb();
	let body: Record<string, unknown>;
	try {
		body = await event.request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}
	const { name, expiresInDays } = body as { name?: string; expiresInDays?: number };

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
export const DELETE: RequestHandler = async (event) => {
	requireAuth(event);
	const db = getDb();
	const url = event.url;
	const id = Number(url.searchParams.get('id'));
	if (!id) throw error(400, 'Token ID required');

	db.delete(emergencyTokens).where(eq(emergencyTokens.id, id)).run();
	return json({ success: true });
};
