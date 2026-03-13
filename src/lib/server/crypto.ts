import { createCipheriv, createDecipheriv, randomBytes, pbkdf2Sync, scryptSync, timingSafeEqual } from 'crypto';
import { getDb } from './db';
import { settings } from './schema';
import { eq } from 'drizzle-orm';

const ALGO = 'aes-256-gcm';
const PREFIX = 'enc:';

/** Get or create a per-installation random salt for encryption key derivation */
function getInstallationSalt(): string {
	const db = getDb();
	const row = db.select().from(settings).where(eq(settings.key, 'encryption_salt')).get();
	if (row?.value) return row.value;
	const salt = randomBytes(32).toString('hex');
	db.insert(settings).values({ key: 'encryption_salt', value: salt })
		.onConflictDoUpdate({ target: settings.key, set: { value: salt } })
		.run();
	return salt;
}

export function deriveKey(password: string): Buffer {
	const salt = getInstallationSalt();
	return pbkdf2Sync(password, salt, 100000, 32, 'sha256');
}

/** Hash password for storage using scrypt (same approach as local-auth) */
export function hashPassword(password: string): string {
	const salt = randomBytes(16).toString('hex');
	const hash = scryptSync(password, salt, 64).toString('hex');
	return `${salt}:${hash}`;
}

/** Verify password against stored scrypt hash using constant-time comparison */
export function verifyPasswordHash(password: string, stored: string): boolean {
	const [salt, hash] = stored.split(':');
	if (!salt || !hash) return false;
	const testHash = scryptSync(password, salt, 64);
	return timingSafeEqual(Buffer.from(hash, 'hex'), testHash);
}

export function encrypt(plaintext: string, key: Buffer): string {
	if (!plaintext) return plaintext;
	const iv = randomBytes(12);
	const cipher = createCipheriv(ALGO, key, iv);
	const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
	const tag = cipher.getAuthTag();
	// Format: enc:iv:tag:ciphertext (all base64)
	return `${PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

export function decrypt(ciphertext: string, key: Buffer): string {
	if (!ciphertext || !isEncrypted(ciphertext)) return ciphertext;
	try {
		const parts = ciphertext.slice(PREFIX.length).split(':');
		if (parts.length !== 3) return ciphertext;
		const iv = Buffer.from(parts[0], 'base64');
		const tag = Buffer.from(parts[1], 'base64');
		const encrypted = Buffer.from(parts[2], 'base64');
		const decipher = createDecipheriv(ALGO, key, iv);
		decipher.setAuthTag(tag);
		return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
	} catch {
		return '[decryption failed]';
	}
}

export function isEncrypted(value: string): boolean {
	return value.startsWith(PREFIX);
}
