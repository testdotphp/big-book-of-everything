import { createCipheriv, createDecipheriv, randomBytes, pbkdf2Sync, createHash } from 'crypto';

const ALGO = 'aes-256-gcm';
const PREFIX = 'enc:';
const SALT = 'big-book-of-everything-v1'; // static salt; key uniqueness from password

export function deriveKey(password: string): Buffer {
	return pbkdf2Sync(password, SALT, 100000, 32, 'sha256');
}

export function hashPassword(password: string): string {
	return createHash('sha256').update(password + SALT).digest('hex');
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
