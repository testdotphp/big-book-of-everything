import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { getDb } from './db';
import { settings } from './schema';
import { eq, like } from 'drizzle-orm';

// ---- Password hashing ----

export function hashPassword(password: string): string {
	const salt = randomBytes(16).toString('hex');
	const hash = scryptSync(password, salt, 64).toString('hex');
	return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
	const [salt, hash] = stored.split(':');
	if (!salt || !hash) return false;
	const testHash = scryptSync(password, salt, 64);
	return timingSafeEqual(Buffer.from(hash, 'hex'), testHash);
}

// ---- Single password mode ----

export function getStoredPassword(): string | null {
	const db = getDb();
	const row = db.select().from(settings).where(eq(settings.key, 'local_password')).get();
	return row?.value || null;
}

export function setLocalPassword(password: string): void {
	const db = getDb();
	const hash = hashPassword(password);
	const existing = db.select().from(settings).where(eq(settings.key, 'local_password')).get();
	if (existing) {
		db.update(settings).set({ value: hash }).where(eq(settings.key, 'local_password')).run();
	} else {
		db.insert(settings).values({ key: 'local_password', value: hash }).run();
	}
}

export function verifyLocalPassword(password: string): boolean {
	const stored = getStoredPassword();
	if (!stored) return false;
	return verifyPassword(password, stored);
}

export function isPasswordSet(): boolean {
	return getStoredPassword() !== null;
}

// ---- Session tokens ----

export function createSessionToken(): string {
	return randomBytes(32).toString('hex');
}

const SESSION_KEY_PREFIX = 'session:';
const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days

export function storeSession(token: string, userId: string, userName: string, role: string = 'user'): void {
	const db = getDb();
	const expires = new Date(Date.now() + SESSION_DURATION).toISOString();
	const value = JSON.stringify({ userId, userName, role, expires });
	db.insert(settings).values({ key: `${SESSION_KEY_PREFIX}${token}`, value }).run();
}

export function getSession(
	token: string
): { userId: string; userName: string; role: string; expires: string } | null {
	const db = getDb();
	const row = db
		.select()
		.from(settings)
		.where(eq(settings.key, `${SESSION_KEY_PREFIX}${token}`))
		.get();
	if (!row?.value) return null;
	try {
		const data = JSON.parse(row.value);
		if (new Date(data.expires) < new Date()) {
			// Expired — clean up
			db.delete(settings)
				.where(eq(settings.key, `${SESSION_KEY_PREFIX}${token}`))
				.run();
			return null;
		}
		return { userId: data.userId, userName: data.userName, role: data.role || 'admin', expires: data.expires };
	} catch {
		return null;
	}
}

export function deleteSession(token: string): void {
	const db = getDb();
	db.delete(settings)
		.where(eq(settings.key, `${SESSION_KEY_PREFIX}${token}`))
		.run();
}

/** Remove all expired sessions from the database */
export function cleanupExpiredSessions(): void {
	const db = getDb();
	const rows = db.select().from(settings).where(like(settings.key, `${SESSION_KEY_PREFIX}%`)).all();
	const now = new Date();
	for (const row of rows) {
		try {
			const data = JSON.parse(row.value || '{}');
			if (data.expires && new Date(data.expires) < now) {
				db.delete(settings).where(eq(settings.key, row.key)).run();
			}
		} catch {
			// Malformed session — remove it
			db.delete(settings).where(eq(settings.key, row.key)).run();
		}
	}
}

// ---- Local users mode ----

const USERS_KEY_PREFIX = 'local_user:';

export function getLocalUsers(): { username: string; name: string; role: string }[] {
	const db = getDb();
	const rows = db.select().from(settings).where(like(settings.key, `${USERS_KEY_PREFIX}%`)).all();
	return rows.map((r) => {
		const data = JSON.parse(r.value || '{}');
		return { username: r.key.slice(USERS_KEY_PREFIX.length), name: data.name || '', role: data.role || 'admin' };
	});
}

export function createLocalUser(username: string, password: string, name: string, role: 'admin' | 'user' = 'user'): boolean {
	const db = getDb();
	const key = `${USERS_KEY_PREFIX}${username}`;
	const existing = db.select().from(settings).where(eq(settings.key, key)).get();
	if (existing) return false;
	const hash = hashPassword(password);
	db.insert(settings).values({ key, value: JSON.stringify({ name, hash, role }) }).run();
	return true;
}

export function verifyLocalUser(
	username: string,
	password: string
): { name: string; role: string } | null {
	const db = getDb();
	const key = `${USERS_KEY_PREFIX}${username}`;
	const row = db.select().from(settings).where(eq(settings.key, key)).get();
	if (!row?.value) return null;
	const data = JSON.parse(row.value);
	if (!verifyPassword(password, data.hash)) return null;
	return { name: data.name, role: data.role || 'admin' };
}

export function deleteLocalUser(username: string): void {
	const db = getDb();
	db.delete(settings)
		.where(eq(settings.key, `${USERS_KEY_PREFIX}${username}`))
		.run();
}

export function getLocalUserRole(username: string): string {
	const db = getDb();
	const row = db.select().from(settings).where(eq(settings.key, `${USERS_KEY_PREFIX}${username}`)).get();
	if (!row?.value) return 'user';
	const data = JSON.parse(row.value);
	return data.role || 'admin';
}

export function hasAnyLocalUsers(): boolean {
	return getLocalUsers().length > 0;
}
