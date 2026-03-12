import { SvelteKitAuth } from '@auth/sveltekit';
import type { Provider } from '@auth/core/providers';
import type { Handle } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

function isAuthEnabled(): boolean {
  return !!(env.OIDC_ISSUER && env.OIDC_CLIENT_ID && env.OIDC_CLIENT_SECRET && env.AUTH_SECRET);
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
} else {
  handle = noAuthHandle;
}

export { handle, signIn, signOut };
