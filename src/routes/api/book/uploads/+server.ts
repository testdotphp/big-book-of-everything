import { json, error, type RequestHandler } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { uploads, sections } from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';

// GET — list uploads for a section
export const GET: RequestHandler = async ({ url }) => {
	const sectionId = Number(url.searchParams.get('sectionId'));
	if (!sectionId) throw error(400, 'sectionId is required');

	const db = getDb();
	const files = db
		.select({
			id: uploads.id,
			filename: uploads.filename,
			mimeType: uploads.mimeType,
			size: uploads.size,
			uploadedAt: uploads.uploadedAt
		})
		.from(uploads)
		.where(eq(uploads.sectionId, sectionId))
		.all();

	return json({ files });
};

// POST — upload a file
export const POST: RequestHandler = async ({ request }) => {
	const formData = await request.formData();
	const sectionId = Number(formData.get('sectionId'));
	const file = formData.get('file') as File | null;

	if (!sectionId || !file) throw error(400, 'sectionId and file are required');

	const db = getDb();

	// Verify section exists and is placeholder type
	const section = db
		.select()
		.from(sections)
		.where(eq(sections.id, sectionId))
		.get();

	if (!section) throw error(404, 'Section not found');
	if (section.type !== 'placeholder') throw error(400, 'Uploads only allowed on placeholder sections');

	// 10MB limit
	if (file.size > 10 * 1024 * 1024) throw error(400, 'File too large (max 10MB)');

	const buffer = Buffer.from(await file.arrayBuffer());
	const base64 = buffer.toString('base64');

	const result = db
		.insert(uploads)
		.values({
			sectionId,
			filename: file.name,
			mimeType: file.type || 'application/octet-stream',
			size: file.size,
			data: base64,
			uploadedAt: new Date().toISOString()
		})
		.returning()
		.get();

	return json({
		id: result.id,
		filename: result.filename,
		mimeType: result.mimeType,
		size: result.size,
		uploadedAt: result.uploadedAt
	});
};

// DELETE — remove a file
export const DELETE: RequestHandler = async ({ url }) => {
	const id = Number(url.searchParams.get('id'));
	if (!id) throw error(400, 'id is required');

	const db = getDb();
	db.delete(uploads).where(eq(uploads.id, id)).run();

	return json({ success: true });
};
