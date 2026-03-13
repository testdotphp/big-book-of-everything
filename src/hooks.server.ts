import { SvelteKitAuth } from '@auth/sveltekit';
import type { Provider } from '@auth/core/providers';
import type { Handle } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { isBookEnabled } from '$lib/server/db';

function isAuthEnabled(): boolean {
  return !!(env.OIDC_ISSUER && env.OIDC_CLIENT_ID && env.OIDC_CLIENT_SECRET && env.AUTH_SECRET);
}

let lastCleanup: number | null = null;

function getLocalAuthMode(): string | null {
  const mode = env.LOCAL_AUTH?.toLowerCase();
  if (mode === 'password' || mode === 'users') return mode;
  return null;
}

function getOidcProvider(): Provider {
  return {
    id: 'oidc',
    name: 'SSO',
    type: 'oidc',
    issuer: env.OIDC_ISSUER!,
    clientId: env.OIDC_CLIENT_ID!,
    clientSecret: env.OIDC_CLIENT_SECRET!,
    checks: ['state'],
    authorization: {
      params: {
        scope: 'openid email profile'
      }
    },
    profile(profile) {
      return {
        id: profile.sub,
        name: profile.name || profile.preferred_username,
        email: profile.email,
        image: profile.picture
      };
    }
  };
}

// Local auth handle — checks cookie-based sessions
const localAuthHandle: Handle = async ({ event, resolve }) => {
  // Lazy import to avoid loading DB at module level when not needed
  const { getSession, cleanupExpiredSessions } = await import('$lib/server/local-auth');

  // Periodically clean up expired sessions (at most once per hour)
  if (!lastCleanup || Date.now() - lastCleanup > 3600_000) {
    lastCleanup = Date.now();
    cleanupExpiredSessions();
  }

  const token = event.cookies.get('local_session');
  if (token) {
    const session = getSession(token);
    if (session) {
      event.locals.auth = async () => ({
        user: { id: session.userId, name: session.userName, email: '' },
        expires: session.expires
      });
      return resolve(event);
    }
  }

  // Not authenticated
  event.locals.auth = async () => null;
  return resolve(event);
};

// No-op handle when auth is disabled — sets a default local user session
const noAuthHandle: Handle = async ({ event, resolve }) => {
  event.locals.auth = async () => ({
    user: { id: 'local', name: 'Local User', email: '' },
    expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
  });
  return resolve(event);
};

let handle: Handle;
let signIn: unknown;
let signOut: unknown;

if (isAuthEnabled()) {
  const auth = SvelteKitAuth({
    providers: [getOidcProvider()],
    pages: {
      signIn: '/login'
    },
    secret: env.AUTH_SECRET!,
    trustHost: true,
    callbacks: {
      async session({ session, token }) {
        if (token?.sub) {
          session.user = {
            ...session.user,
            id: token.sub
          };
        }
        return session;
      }
    }
  });
  handle = auth.handle;
  signIn = auth.signIn;
  signOut = auth.signOut;
} else if (getLocalAuthMode()) {
  handle = localAuthHandle;
} else {
  handle = noAuthHandle;
}

export { handle, signIn, signOut };
