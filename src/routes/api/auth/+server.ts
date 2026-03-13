import { json, type RequestHandler } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import {
	verifyLocalPassword,
	setLocalPassword,
	isPasswordSet,
	verifyLocalUser,
	createLocalUser,
	hasAnyLocalUsers,
	getLocalUsers,
	deleteLocalUser,
	createSessionToken,
	storeSession,
	deleteSession
} from '$lib/server/local-auth';

const COOKIE_NAME = 'local_session';

function getLocalAuthMode(): string | null {
	const mode = env.LOCAL_AUTH?.toLowerCase();
	if (mode === 'password' || mode === 'users') return mode;
	return null;
}

export const GET: RequestHandler = async () => {
	const mode = getLocalAuthMode();
	if (!mode) return json({ enabled: false });

	if (mode === 'password') {
		return json({ enabled: true, mode: 'password', needsSetup: !isPasswordSet() });
	}

	return json({
		enabled: true,
		mode: 'users',
		needsSetup: !hasAnyLocalUsers(),
		users: getLocalUsers().map((u) => ({ username: u.username, name: u.name }))
	});
};

export const POST: RequestHandler = async ({ request, cookies }) => {
	const mode = getLocalAuthMode();
	if (!mode) return json({ error: 'Local auth not enabled' }, { status: 400 });

	const body = await request.json();
	const { action } = body;

	// --- Single password mode ---
	if (mode === 'password') {
		if (action === 'setup') {
			if (isPasswordSet()) return json({ error: 'Password already set' }, { status: 400 });
			const { password } = body;
			if (!password || password.length < 4) return json({ error: 'Password too short' }, { status: 400 });
			setLocalPassword(password);
			const token = createSessionToken();
			storeSession(token, 'local', 'Local User');
			cookies.set(COOKIE_NAME, token, { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 30 * 24 * 60 * 60 });
			return json({ ok: true });
		}

		if (action === 'login') {
			const { password } = body;
			if (!verifyLocalPassword(password)) return json({ error: 'Incorrect password' }, { status: 401 });
			const token = createSessionToken();
			storeSession(token, 'local', 'Local User');
			cookies.set(COOKIE_NAME, token, { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 30 * 24 * 60 * 60 });
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
			const { username, password, name } = body;
			if (!username?.trim() || !password || password.length < 4) {
				return json({ error: 'Username and password (4+ chars) required' }, { status: 400 });
			}
			const ok = createLocalUser(username.trim().toLowerCase(), password, name?.trim() || username.trim());
			if (!ok) return json({ error: 'Username already exists' }, { status: 409 });
			const token = createSessionToken();
			storeSession(token, username.trim().toLowerCase(), name?.trim() || username.trim());
			cookies.set(COOKIE_NAME, token, { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 30 * 24 * 60 * 60 });
			return json({ ok: true });
		}

		if (action === 'login') {
			const { username, password } = body;
			const user = verifyLocalUser(username?.trim()?.toLowerCase(), password);
			if (!user) return json({ error: 'Invalid username or password' }, { status: 401 });
			const token = createSessionToken();
			storeSession(token, username.trim().toLowerCase(), user.name);
			cookies.set(COOKIE_NAME, token, { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 30 * 24 * 60 * 60 });
			return json({ ok: true });
		}

		if (action === 'logout') {
			const token = cookies.get(COOKIE_NAME);
			if (token) deleteSession(token);
			cookies.delete(COOKIE_NAME, { path: '/' });
			return json({ ok: true });
		}

		if (action === 'deleteUser') {
			const { username } = body;
			if (!username) return json({ error: 'Username required' }, { status: 400 });
			deleteLocalUser(username);
			return json({ ok: true });
		}
	}

	return json({ error: 'Invalid action' }, { status: 400 });
};
