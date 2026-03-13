import type { PageServerLoad } from './$types';
import { getDb } from '$lib/server/db';
import { emergencyTokens } from '$lib/server/schema';

export const load: PageServerLoad = async () => {
	const db = getDb();
	const tokens = db.select().from(emergencyTokens).all();
	return {
		tokens: tokens.map((t) => ({
			...t,
			expired: t.expiresAt ? new Date(t.expiresAt) < new Date() : false
		}))
	};
};
