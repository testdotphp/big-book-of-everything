import type { LayoutServerLoad } from './$types';
import { getPortalConfig } from '$lib/server/config';
import { isBookEnabled } from '$lib/server/db';
import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export const load: LayoutServerLoad = async (event) => {
  const session = await event.locals.auth?.();
  const bookMode = env.PORTAL_MODE === 'book';

  // In book mode, use a simplified config
  const config = bookMode
    ? { name: 'Big Book of Everything', icon: 'book-open', theme: '#4CAF50', items: [] }
    : getPortalConfig();

  // Protect all routes except auth callbacks (skip in book mode — no auth needed)
  if (!bookMode && !session?.user && !event.url.pathname.startsWith('/auth') && event.url.pathname !== '/login') {
    throw redirect(302, '/login');
  }

  return {
    session,
    config,
    bookEnabled: isBookEnabled(),
    bookMode
  };
};
