import { SvelteKitAuth } from '@auth/sveltekit';
import type { Provider } from '@auth/core/providers';
import { env } from '$env/dynamic/private';

function requireEnv(name: string): string {
  const value = env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function getAuthentikProvider(): Provider {
  return {
    id: 'authentik',
    name: 'Authentik',
    type: 'oidc',
    issuer: requireEnv('OIDC_ISSUER'),
    clientId: requireEnv('OIDC_CLIENT_ID'),
    clientSecret: requireEnv('OIDC_CLIENT_SECRET'),
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

export const { handle, signIn, signOut } = SvelteKitAuth({
  providers: [getAuthentikProvider()],
  pages: {
    signIn: '/login'
  },
  secret: requireEnv('AUTH_SECRET'),
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
