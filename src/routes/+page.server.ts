import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export const load: PageServerLoad = async () => {
  if (env.PORTAL_MODE === 'book') {
    throw redirect(302, '/book');
  }
};
