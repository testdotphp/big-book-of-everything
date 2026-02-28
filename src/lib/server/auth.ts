import { SvelteKitAuth } from '@auth/sveltekit';
import type { Provider } from '@auth/core/providers';
import { env } from '$env/dynamic/private';

function getAuthentikProvider(): Provider {
  const issuer = env.OIDC_ISSUER || 'https://authentik.teedge.local/application/o/portal/';

  return {
    id: 'authentik',
    name: 'Authentik',
    type: 'oidc',
    issuer,
    clientId: env.OIDC_CLIENT_ID || '',
    clientSecret: env.OIDC_CLIENT_SECRET || '',
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
  secret: env.AUTH_SECRET || 'change-me-in-production',
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
