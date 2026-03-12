import type { LayoutServerLoad } from './$types';
import { isBookEnabled } from '$lib/server/db';
import { error } from '@sveltejs/kit';

export const load: LayoutServerLoad = async () => {
  if (!isBookEnabled()) {
    throw error(404, 'Not found');
  }
};
