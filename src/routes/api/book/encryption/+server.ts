import { json, error, type RequestHandler } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { settings, fields, values } from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';
import { deriveKey, hashPassword, verifyPasswordHash, encrypt, decrypt, isEncrypted } from '$lib/server/crypto';
import { setEncryptionKey, clearEncryptionKey, getEncryptionKey } from '$lib/server/encryption-session';
import { checkRateLimit } from '$lib/server/rate-limit';

// GET: check encryption status
export const GET: RequestHandler = async () => {
	const db = getDb();
	const pwHash = db.select().from(settings).where(eq(settings.key, 'encryption_hash')).get();
	return json({
		hasPassword: !!pwHash?.value,
		unlocked: !!getEncryptionKey()
	});
};

// POST: actions — setPassword, encrypt, decrypt, removePassword
export const POST: RequestHandler = async ({ request }) => {
	const db = getDb();
	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}
	const { action, password, newPassword } = body as { action: string; password?: string; newPassword?: string };

	// Rate limit password-related actions
	if (action === 'unlock' || action === 'setPassword' || action === 'changePassword' || action === 'verify') {
		if (!checkRateLimit('encryption')) {
			throw error(429, 'Too many attempts. Try again later.');
		}
	}

	if (action === 'unlock') {
		if (!password) throw error(400, 'Password required');
		const existing = db.select().from(settings).where(eq(settings.key, 'encryption_hash')).get();
		if (!existing?.value) return json({ success: true });
		if (!verifyPasswordHash(password, existing.value)) throw error(403, 'Wrong password');
		setEncryptionKey(password);
		return json({ success: true });
	}

	if (action === 'lock') {
		clearEncryptionKey();
		return json({ success: true });
	}

	if (action === 'setPassword') {
		if (!password) throw error(400, 'Password required');

		const existing = db.select().from(settings).where(eq(settings.key, 'encryption_hash')).get();
		if (existing?.value) throw error(400, 'Password already set. Remove it first.');

		const hash = hashPassword(password);
		db.insert(settings)
			.values({ key: 'encryption_hash', value: hash })
			.onConflictDoUpdate({ target: settings.key, set: { value: hash } })
			.run();

		// Encrypt all sensitive field values
		const key = deriveKey(password);
		encryptSensitiveValues(db, key);
		setEncryptionKey(password);

		return json({ success: true });
	}

	if (action === 'changePassword') {
		if (!password || !newPassword) throw error(400, 'Both passwords required');

		const existing = db.select().from(settings).where(eq(settings.key, 'encryption_hash')).get();
		if (!existing?.value) throw error(400, 'No password set');
		if (!verifyPasswordHash(password, existing.value)) throw error(403, 'Wrong password');

		// Decrypt with old key, re-encrypt with new
		const oldKey = deriveKey(password);
		const newKey = deriveKey(newPassword);

		reEncryptValues(db, oldKey, newKey);

		const newHash = hashPassword(newPassword);
		db.update(settings).set({ value: newHash }).where(eq(settings.key, 'encryption_hash')).run();
		setEncryptionKey(newPassword);

		return json({ success: true });
	}

	if (action === 'removePassword') {
		if (!password) throw error(400, 'Password required');

		const existing = db.select().from(settings).where(eq(settings.key, 'encryption_hash')).get();
		if (!existing?.value) throw error(400, 'No password set');
		if (!verifyPasswordHash(password, existing.value)) throw error(403, 'Wrong password');

		// Decrypt all values
		const key = deriveKey(password);
		decryptSensitiveValues(db, key);

		db.delete(settings).where(eq(settings.key, 'encryption_hash')).run();

		return json({ success: true });
	}

	if (action === 'verify') {
		if (!password) throw error(400, 'Password required');
		const existing = db.select().from(settings).where(eq(settings.key, 'encryption_hash')).get();
		if (!existing?.value) return json({ valid: true });
		return json({ valid: verifyPasswordHash(password, existing.value) });
	}

	throw error(400, 'Unknown action');
};

function encryptSensitiveValues(db: ReturnType<typeof import('$lib/server/db').getDb>, key: Buffer) {
	const sensitiveFields = db.select({ id: fields.id })
		.from(fields)
		.where(eq(fields.sensitive, 1))
		.all();

	const fieldIds = new Set(sensitiveFields.map(f => f.id));

	const allValues = db.select().from(values).all();
	for (const v of allValues) {
		if (!v.value || !fieldIds.has(v.fieldId) || isEncrypted(v.value)) continue;
		const encrypted = encrypt(v.value, key);
		db.update(values).set({ value: encrypted }).where(eq(values.id, v.id)).run();
	}
}

function decryptSensitiveValues(db: ReturnType<typeof import('$lib/server/db').getDb>, key: Buffer) {
	const allValues = db.select().from(values).all();
	for (const v of allValues) {
		if (!v.value || !isEncrypted(v.value)) continue;
		const decrypted = decrypt(v.value, key);
		db.update(values).set({ value: decrypted }).where(eq(values.id, v.id)).run();
	}
}

function reEncryptValues(db: ReturnType<typeof import('$lib/server/db').getDb>, oldKey: Buffer, newKey: Buffer) {
	const allValues = db.select().from(values).all();
	for (const v of allValues) {
		if (!v.value || !isEncrypted(v.value)) continue;
		const decrypted = decrypt(v.value, oldKey);
		const reEncrypted = encrypt(decrypted, newKey);
		db.update(values).set({ value: reEncrypted }).where(eq(values.id, v.id)).run();
	}
}
