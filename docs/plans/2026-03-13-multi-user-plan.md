# Multi-User Support Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add in-app user management so the first user becomes admin and can add/remove other users from Settings.

**Architecture:** Add `role` field to user/session JSON in existing settings table. First registered user gets `role: "admin"`, admin creates subsequent users. No schema migration needed — user data is JSON in key-value settings table.

**Tech Stack:** SvelteKit 5, Drizzle ORM, SQLite (better-sqlite3), scrypt password hashing

---

### Task 1: Add role to local-auth functions

**Files:**
- Modify: `src/lib/server/local-auth.ts`

**Changes:**

1. Update `createLocalUser` to accept and store `role`:

```ts
export function createLocalUser(username: string, password: string, name: string, role: 'admin' | 'user' = 'user'): boolean {
	const db = getDb();
	const key = `${USERS_KEY_PREFIX}${username}`;
	const existing = db.select().from(settings).where(eq(settings.key, key)).get();
	if (existing) return false;
	const hash = hashPassword(password);
	db.insert(settings).values({ key, value: JSON.stringify({ name, hash, role }) }).run();
	return true;
}
```

2. Update `getLocalUsers` to return `role` (default `"admin"` for backward compat):

```ts
export function getLocalUsers(): { username: string; name: string; role: string }[] {
	const db = getDb();
	const rows = db.select().from(settings).where(like(settings.key, `${USERS_KEY_PREFIX}%`)).all();
	return rows.map((r) => {
		const data = JSON.parse(r.value || '{}');
		return { username: r.key.slice(USERS_KEY_PREFIX.length), name: data.name || '', role: data.role || 'admin' };
	});
}
```

3. Add `getLocalUserRole` helper:

```ts
export function getLocalUserRole(username: string): string {
	const db = getDb();
	const row = db.select().from(settings).where(eq(settings.key, `${USERS_KEY_PREFIX}${username}`)).get();
	if (!row?.value) return 'user';
	const data = JSON.parse(row.value);
	return data.role || 'admin';
}
```

4. Update `storeSession` to accept and store `role`:

```ts
export function storeSession(token: string, userId: string, userName: string, role: string = 'user'): void {
	const db = getDb();
	const expires = new Date(Date.now() + SESSION_DURATION).toISOString();
	const value = JSON.stringify({ userId, userName, role, expires });
	db.insert(settings).values({ key: `${SESSION_KEY_PREFIX}${token}`, value }).run();
}
```

5. Update `getSession` return type to include `role`:

```ts
export function getSession(
	token: string
): { userId: string; userName: string; role: string; expires: string } | null {
	// ... existing logic unchanged, role comes from stored JSON
	// backward compat: if role missing, return 'admin'
}
```

Inside the try block where `data` is parsed, before returning, ensure role fallback:
```ts
return { ...data, role: data.role || 'admin' };
```

6. Update `verifyLocalUser` to also return `role`:

```ts
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
```

**Commit:** `feat: add role field to local-auth user and session functions`

---

### Task 2: Update auth API endpoints

**Files:**
- Modify: `src/routes/api/auth/+server.ts`

**Changes to GET handler:**

Add role for the current authenticated user by accepting cookies parameter and looking up session:

```ts
export const GET: RequestHandler = async ({ cookies }) => {
	const mode = getLocalAuthMode();
	if (!mode) return json({ enabled: false });

	if (mode === 'password') {
		return json({ enabled: true, mode: 'password', needsSetup: !isPasswordSet() });
	}

	// Get current user's role from session
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
```

**Changes to POST handler (users mode):**

1. Update `register` action — first user gets admin, block after that:

```ts
if (action === 'register') {
	// Only allow registration when no users exist (first user setup)
	if (hasAnyLocalUsers()) {
		return json({ error: 'Registration is closed. Ask an admin to add you.' }, { status: 403 });
	}
	const { username, password, name } = body;
	if (!username?.trim() || !password || password.length < 4) {
		return json({ error: 'Username and password (4+ chars) required' }, { status: 400 });
	}
	// First user is always admin
	const role = 'admin';
	const ok = createLocalUser(username.trim().toLowerCase(), password, name?.trim() || username.trim(), role);
	if (!ok) return json({ error: 'Username already exists' }, { status: 409 });
	const token = createSessionToken();
	storeSession(token, username.trim().toLowerCase(), name?.trim() || username.trim(), role);
	cookies.set(COOKIE_NAME, token, cookieOpts());
	return json({ ok: true });
}
```

2. Add new `addUser` action (admin only):

```ts
if (action === 'addUser') {
	const sessionToken = cookies.get(COOKIE_NAME);
	const session = sessionToken ? getSession(sessionToken) : null;
	if (!session || session.role !== 'admin') {
		throw error(401, 'Admin access required');
	}
	const { username, password, name } = body;
	if (!username?.trim() || !password || password.length < 4) {
		return json({ error: 'Username and password (4+ chars) required' }, { status: 400 });
	}
	const ok = createLocalUser(username.trim().toLowerCase(), password as string, (name as string)?.trim() || username.trim(), 'user');
	if (!ok) return json({ error: 'Username already exists' }, { status: 409 });
	return json({ ok: true });
}
```

3. Update `deleteUser` — admin only, prevent self-delete:

```ts
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
```

4. Update `login` action to include role in session:

```ts
if (action === 'login') {
	const { username, password } = body;
	const user = verifyLocalUser(username?.trim()?.toLowerCase(), password);
	if (!user) return json({ error: 'Invalid username or password' }, { status: 401 });
	const token = createSessionToken();
	storeSession(token, username.trim().toLowerCase(), user.name, user.role);
	cookies.set(COOKIE_NAME, token, cookieOpts());
	return json({ ok: true });
}
```

5. Add `getLocalUserRole` to imports at top:

```ts
import {
	// ... existing imports ...
	getLocalUserRole
} from '$lib/server/local-auth';
```

**Commit:** `feat: add addUser action, restrict register/deleteUser to admin`

---

### Task 3: Pass role through hooks and layout

**Files:**
- Modify: `src/hooks.server.ts`
- Modify: `src/routes/+layout.server.ts`

**hooks.server.ts** — update `localAuthHandle` to include `role`:

```ts
const localAuthHandle: Handle = async ({ event, resolve }) => {
  const { getSession, cleanupExpiredSessions } = await import('$lib/server/local-auth');

  if (!lastCleanup || Date.now() - lastCleanup > 3600_000) {
    lastCleanup = Date.now();
    cleanupExpiredSessions();
  }

  const token = event.cookies.get('local_session');
  if (token) {
    const session = getSession(token);
    if (session) {
      event.locals.auth = async () => ({
        user: { id: session.userId, name: session.userName, email: '', role: session.role },
        expires: session.expires
      });
      return resolve(event);
    }
  }

  event.locals.auth = async () => null;
  return resolve(event);
};
```

**layout.server.ts** — no changes needed. The `session` object already gets passed to frontend and will now include `role` in `session.user.role` automatically.

**Commit:** `feat: pass user role through auth session`

---

### Task 4: Add user management to settings page

**Files:**
- Modify: `src/routes/book/settings/+page.server.ts`
- Modify: `src/routes/book/settings/+page.svelte`

**+page.server.ts** — add user list and auth mode to load:

```ts
import { env } from '$env/dynamic/private';
import { getLocalUsers } from '$lib/server/local-auth';

// Inside load function, add:
const localAuthMode = env.LOCAL_AUTH?.toLowerCase() || null;
const isUsersMode = localAuthMode === 'users';
const users = isUsersMode ? getLocalUsers() : [];

// Add to return:
return {
	// ... existing fields ...
	users,
	isUsersMode
};
```

**+page.svelte** — add User Management section between Appearance and Data & Backup:

Add to script section:
```ts
import { Users, UserPlus, Trash2 } from 'lucide-svelte';
// (Users and Trash2 may already be imported, UserPlus is new)

// User management state
let newUsername = $state('');
let newPassword = $state('');
let newDisplayName = $state('');
let userStatus = $state<{ type: 'success' | 'error'; message: string } | null>(null);
let userLoading = $state(false);
let userList = $state(data.users);

// Get current user role from layout session data
let currentRole = $derived((data as any).session?.user?.role || 'user');
let isAdmin = $derived(currentRole === 'admin');

async function addUser() {
  if (!newUsername.trim() || !newPassword || newPassword.length < 4) {
    userStatus = { type: 'error', message: 'Username and password (4+ chars) required.' };
    return;
  }
  userLoading = true;
  userStatus = null;
  try {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'addUser', username: newUsername.trim(), password: newPassword, name: newDisplayName.trim() || newUsername.trim() })
    });
    const result = await res.json();
    if (!res.ok) {
      userStatus = { type: 'error', message: result.error || 'Failed to add user.' };
    } else {
      userStatus = { type: 'success', message: `User "${newUsername.trim()}" added.` };
      newUsername = '';
      newPassword = '';
      newDisplayName = '';
      await refreshUsers();
    }
  } catch {
    userStatus = { type: 'error', message: 'Network error.' };
  }
  userLoading = false;
}

async function removeUser(username: string) {
  if (!confirm(`Remove user "${username}"? They will lose access to the app.`)) return;
  try {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'deleteUser', username })
    });
    const result = await res.json();
    if (!res.ok) {
      userStatus = { type: 'error', message: result.error || 'Failed to remove user.' };
    } else {
      userStatus = { type: 'success', message: `User "${username}" removed.` };
      await refreshUsers();
    }
  } catch {
    userStatus = { type: 'error', message: 'Network error.' };
  }
}

async function refreshUsers() {
  try {
    const res = await fetch('/api/auth');
    const data = await res.json();
    if (data.users) userList = data.users;
  } catch { /* ignore */ }
}
```

Add HTML between Appearance section and Data & Backup heading (around line 467):

```svelte
{#if data.isUsersMode && isAdmin}
<h2 class="section-heading">User Management</h2>
<p class="subtitle">Add and remove users who can access the Big Book.</p>

<div class="settings-card">
  <h3 class="card-title"><Users size={16} strokeWidth={2} /> Users</h3>

  {#if userStatus}
    <div class="status-message {userStatus.type}">
      {#if userStatus.type === 'success'}<CheckCircle size={14} />{:else}<XCircle size={14} />{/if}
      {userStatus.message}
      <button class="close-btn" onclick={() => userStatus = null}><X size={12} /></button>
    </div>
  {/if}

  <div class="user-list">
    {#each userList as user}
      <div class="user-row">
        <div class="user-info">
          <span class="user-name">{user.name}</span>
          <span class="user-username">@{user.username}</span>
          {#if user.role === 'admin'}
            <span class="user-badge admin">Admin</span>
          {/if}
        </div>
        {#if user.role !== 'admin'}
          <button class="btn danger-outline btn-sm" onclick={() => removeUser(user.username)}>
            <Trash2 size={13} strokeWidth={2} />
            Remove
          </button>
        {/if}
      </div>
    {/each}
  </div>

  <div class="add-user-form">
    <h4>Add a new user</h4>
    <div class="form-row">
      <input type="text" placeholder="Username" bind:value={newUsername} class="enc-input" />
      <input type="text" placeholder="Display name" bind:value={newDisplayName} class="enc-input" />
    </div>
    <div class="form-row">
      <input type="password" placeholder="Password (4+ chars)" bind:value={newPassword} class="enc-input" />
      <button class="btn primary" onclick={addUser} disabled={userLoading}>
        <UserPlus size={15} strokeWidth={2} />
        {userLoading ? 'Adding...' : 'Add User'}
      </button>
    </div>
  </div>
</div>
{/if}
```

Add CSS at the end of the style block:

```css
.user-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
}

.user-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.625rem 0.75rem;
  background: var(--color-surface-alt, rgba(255,255,255,0.03));
  border-radius: 6px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.user-name {
  font-weight: 500;
  color: var(--color-text);
}

.user-username {
  color: var(--color-text-muted);
  font-size: 0.85rem;
}

.user-badge {
  font-size: 0.7rem;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.user-badge.admin {
  background: var(--color-accent, #4CAF50);
  color: #fff;
}

.btn-sm {
  padding: 0.3rem 0.6rem;
  font-size: 0.8rem;
}

.add-user-form {
  border-top: 1px solid var(--color-border);
  padding-top: 1rem;
}

.add-user-form h4 {
  margin: 0 0 0.75rem;
  font-size: 0.9rem;
  color: var(--color-text-muted);
}

.form-row {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.form-row input {
  flex: 1;
}
```

**Commit:** `feat: add user management UI to settings page`

---

### Task 5: Update login page for closed registration

**Files:**
- Modify: `src/routes/login/+page.svelte`

The login page currently shows a registration form when `needsSetup` is true. After Task 2, the `register` API action will return 403 if users already exist, so the server-side protection is in place.

The login page already conditionally shows the registration form only when `needsSetup` is true, so **no changes are needed** to the login page. When `hasAnyLocalUsers()` returns true, `needsSetup` is false, and the login form is shown instead.

**No commit needed for this task — it works as-is.**

---

## Verification

1. Delete `data/book-dev.db` and restart with `PORTAL_MODE=book LOCAL_AUTH=users BOOK_DB_PATH=./data/book-dev.db npm run dev`
2. Visit `/login` — registration form shown (needsSetup=true)
3. Register first user — should redirect to `/book`, user has admin role
4. Go to Settings — "User Management" section visible with admin listed
5. Add a second user via the form — user appears in list
6. Open an incognito window, login as the second user
7. Go to Settings as second user — "User Management" section should NOT be visible
8. Return to admin window — remove the second user
9. Incognito user should no longer be able to access protected routes after session expires
10. Restart the app — first user still has admin role (backward compat)
