import type { PageServerLoad } from './$types';
import { getPortalConfig } from '$lib/server/config';
import { error } from '@sveltejs/kit';
import { isNavGroup } from '$lib/types';
import type { NavItem } from '$lib/types';

export const load: PageServerLoad = async ({ params }) => {
  const config = getPortalConfig();

  // Find the matching nav item by slug
  let found: NavItem | undefined;

  for (const item of config.items) {
    if (isNavGroup(item)) {
      found = item.children.find((c) => c.slug === params.slug);
    } else if (item.slug === params.slug) {
      found = item;
    }
    if (found) break;
  }

  if (!found) {
    throw error(404, `App "${params.slug}" not found in portal config`);
  }

  return {
    app: found
  };
};
