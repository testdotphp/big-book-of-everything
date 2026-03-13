import { json, error, type RequestHandler } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { checkRateLimit } from '$lib/server/rate-limit';
import {
	verifyLocalPassword,
	setLocalPassword,
	isPasswordSet,
	verifyLocalUser,
	createLocalUser,
	hasAnyLocalUsers,
	getLocalUsers,
	deleteLocalUser,
	getLocalUserRole,
	createSessionToken,
	storeSession,
	deleteSession,
	getSession
} from '$lib/server/local-auth';

const COOKIE_NAME = 'local_session';

function isSecure(): boolean {
	return env.ORIGIN?.startsWith('https') || false;
}

function cookieOpts() {
	return { path: '/', httpOnly: true, sameSite: 'lax' as const, maxAge: 30 * 24 * 60 * 60, secure: isSecure() };
}

function getLocalAuthMode(): string | null {
	const mode = env.LOCAL_AUTH?.toLowerCase();
	if (mode === 'password' || mode === 'users') return mode;
	return null;
}

export const GET: RequestHandler = async ({ cookies }) => {
	const mode = getLocalAuthMode();
	if (!mode) return json({ enabled: false });

	if (mode === 'password') {
		return json({ enabled: true, mode: 'password', needsSetup: !isPasswordSet() });
	}

	let currentRole: string | null = null;
	const token = cookies.get('local_session');
	if (token) {
		const session = getSession(token);
		if (session) currentRole = session.role;
	}

	return json({
		enabled: true,
		mode: 'users',
		needsSetup: !hasAnyLocalUsers(),
		users: getLocalUsers().map((u) => ({ username: u.username, name: u.name, role: u.role })),
		currentRole
	});
};

export const POST: RequestHandler = async ({ request, cookies }) => {
	const mode = getLocalAuthMode();
	if (!mode) return json({ error: 'Local auth not enabled' }, { status: 400 });

	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}
	const { action } = body;

	// Rate limit login/setup attempts
	if (action === 'login' || action === 'setup' || action === 'register') {
		if (!checkRateLimit('auth')) {
			throw error(429, 'Too many attempts. Try again later.');
		}
	}

	// --- Single password mode ---
	if (mode === 'password') {
		if (action === 'setup') {
			if (isPasswordSet()) return json({ error: 'Password already set' }, { status: 400 });
			const { password } = body;
			if (!password || password.length < 4) return json({ error: 'Password too short' }, { status: 400 });
			setLocalPassword(password);
			const token = createSessionToken();
			storeSession(token, 'local', 'Local User');
			cookies.set(COOKIE_NAME, token, cookieOpts());
			return json({ ok: true });
		}

		if (action === 'login') {
			const { password } = body;
			if (!verifyLocalPassword(password)) return json({ error: 'Incorrect password' }, { status: 401 });
			const token = createSessionToken();
			storeSession(token, 'local', 'Local User');
			cookies.set(COOKIE_NAME, token, cookieOpts());
			return json({ ok: true });
		}

		if (action === 'logout') {
			const token = cookies.get(COOKIE_NAME);
			if (token) deleteSession(token);
			cookies.delete(COOKIE_NAME, { path: '/' });
			return json({ ok: true });
		}
	}

	// --- Multi-user mode ---
	if (mode === 'users') {
		if (action === 'register') {
			if (hasAnyLocalUsers()) {
				return json({ error: 'Registration is closed. Ask an admin to add you.' }, { status: 403 });
			}
			const { username, password, name } = body;
			if (!username?.trim() || !password || (password as string).length < 4) {
				return json({ error: 'Username and password (4+ chars) required' }, { status: 400 });
			}
			const role = 'admin';
			const ok = createLocalUser(username.trim().toLowerCase(), password as string, (name as string)?.trim() || username.trim(), role);
			if (!ok) return json({ error: 'Username already exists' }, { status: 409 });
			const token = createSessionToken();
			storeSession(token, username.trim().toLowerCase(), (name as string)?.trim() || username.trim(), role);
			cookies.set(COOKIE_NAME, token, cookieOpts());
			return json({ ok: true });
		}

		if (action === 'login') {
			const { username, password } = body;
			const user = verifyLocalUser(username?.trim()?.toLowerCase(), password as string);
			if (!user) return json({ error: 'Invalid username or password' }, { status: 401 });
			const token = createSessionToken();
			storeSession(token, username.trim().toLowerCase(), user.name, user.role);
			cookies.set(COOKIE_NAME, token, cookieOpts());
			return json({ ok: true });
		}

		if (action === 'logout') {
			const token = cookies.get(COOKIE_NAME);
			if (token) deleteSession(token);
			cookies.delete(COOKIE_NAME, { path: '/' });
			return json({ ok: true });
		}

		if (action === 'deleteUser') {
			const sessionToken = cookies.get(COOKIE_NAME);
			const session = sessionToken ? getSession(sessionToken) : null;
			if (!session || session.role !== 'admin') {
				throw error(401, 'Admin access required');
			}
			const { username } = body;
			if (!username) return json({ error: 'Username required' }, { status: 400 });
			if (username === session.userId) {
				return json({ error: 'Cannot delete your own account' }, { status: 400 });
			}
			deleteLocalUser(username as string);
			return json({ ok: true });
		}

		if (action === 'addUser') {
			const sessionToken = cookies.get(COOKIE_NAME);
			const session = sessionToken ? getSession(sessionToken) : null;
			if (!session || session.role !== 'admin') {
				throw error(401, 'Admin access required');
			}
			const { username, password, name } = body;
			if (!username?.trim() || !password || (password as string).length < 4) {
				return json({ error: 'Username and password (4+ chars) required' }, { status: 400 });
			}
			const ok = createLocalUser(username.trim().toLowerCase(), password as string, (name as string)?.trim() || username.trim(), 'user');
			if (!ok) return json({ error: 'Username already exists' }, { status: 409 });
			return json({ ok: true });
		}
	}

	return json({ error: 'Invalid action' }, { status: 400 });
};
