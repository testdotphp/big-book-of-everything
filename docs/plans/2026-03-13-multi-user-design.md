# Multi-User Support — Design

## Goal

Add in-app user management so the admin can add and remove users from the Settings page. All users share one book.

## Decisions

| Question | Answer |
|---|---|
| First user flow | First visitor to register becomes admin automatically |
| Data isolation | Shared — everyone sees and edits the same book |
| Admin privileges | User management only (add/remove users) |
| Registration | Closed after first user; admin adds subsequent users |

## Data Model Changes

**User record** (`local_user:{username}` in settings table):
```json
{ "name": "TJ", "hash": "salt:hash", "role": "admin" }
```

- `role`: `"admin"` or `"user"`
- Backward compat: missing `role` field defaults to `"admin"`

**Session record** (`session:{token}` in settings table):
```json
{ "userId": "tj", "userName": "TJ", "role": "admin", "expires": "..." }
```

- `role` added so hooks can pass it to frontend without extra DB reads

## API Changes

**`GET /api/auth`** (users mode):
- Add `role` to response for current authenticated user
- Already returns `users` list — add `role` to each user object

**`POST /api/auth`** actions:
- `register`: Sets `role: "admin"` for first user. Blocked when any users exist (no public registration).
- `addUser` (new): Admin-only. Creates user with `role: "user"`. Inputs: username, password, name.
- `deleteUser`: Restricted to admin only. Cannot delete yourself.

## Auth Flow Changes

**`src/lib/server/local-auth.ts`**:
- `createLocalUser()`: Accept optional `role` parameter (default `"user"`)
- `storeSession()`: Accept and store `role`
- `getSession()`: Return `role`
- `getLocalUsers()`: Return `role` in user list
- New: `getLocalUser(username)`: Return single user record with role

**`src/hooks.server.ts`**:
- `localAuthHandle`: Pass `role` through `event.locals.auth()` return value

**`src/routes/+layout.server.ts`**:
- Pass `role` to frontend via session data

## UI Changes

**Settings page** — new "User Management" card (admin only):
- User list with role badges and remove buttons
- Add User form: username, password, display name
- Admin cannot remove themselves
- Fetches user list on mount and after mutations

**Login page**:
- No changes needed — `needsSetup` flow already handles first-user registration
- After first user exists, only shows login form (register blocked server-side)

## Files Modified

| File | Change |
|---|---|
| `src/lib/server/local-auth.ts` | Add role to user/session functions |
| `src/routes/api/auth/+server.ts` | Add `addUser` action, restrict `register`/`deleteUser`, include role in GET |
| `src/hooks.server.ts` | Pass role from session to locals |
| `src/routes/+layout.server.ts` | Include role in frontend session data |
| `src/routes/book/settings/+page.server.ts` | Load user list and current role for settings page |
| `src/routes/book/settings/+page.svelte` | Add User Management card |
| `src/routes/login/+page.svelte` | No changes (registration blocking is server-side) |
