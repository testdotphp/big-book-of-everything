import { error, type RequestHandler } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { uploads } from '$lib/server/schema';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async ({ url }) => {
	const id = Number(url.searchParams.get('id'));
	if (!id) throw error(400, 'id is required');

	const db = getDb();
	const file = db.select().from(uploads).where(eq(uploads.id, id)).get();

	if (!file) throw error(404, 'File not found');

	const buffer = Buffer.from(file.data, 'base64');

	return new Response(buffer, {
		headers: {
			'Content-Type': file.mimeType,
			'Content-Disposition': `attachment; filename="${file.filename}"`,
			'Content-Length': String(buffer.length)
		}
	});
};
