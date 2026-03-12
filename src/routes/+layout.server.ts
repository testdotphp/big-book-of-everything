import type { LayoutServerLoad } from './$types';
import { getPortalConfig } from '$lib/server/config';
import { isBookEnabled } from '$lib/server/db';
import { redirect } from '@sveltejs/kit';

export const load: LayoutServerLoad = async (event) => {
  const session = await event.locals.auth?.();
  const config = getPortalConfig();

  // Protect all routes except auth callbacks
  if (!session?.user && !event.url.pathname.startsWith('/auth') && event.url.pathname !== '/login') {
    throw redirect(302, '/login');
  }

  return {
    session,
    config,
    bookEnabled: isBookEnabled()
  };
};
