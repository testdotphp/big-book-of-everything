import type { LayoutServerLoad } from './$types';
import { getPortalConfig } from '$lib/server/config';
import { isBookEnabled, getDb } from '$lib/server/db';
import { categories, sections } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export const load: LayoutServerLoad = async (event) => {
  const session = await event.locals.auth?.();
  const bookMode = env.PORTAL_MODE === 'book';
  const bookEnabled = isBookEnabled();

  // In book mode, use a simplified config
  const config = bookMode
    ? { name: 'Big Book of Everything', icon: 'book-open', theme: '#4CAF50', items: [] }
    : getPortalConfig();

  // Protect all routes except auth callbacks (skip in book mode — no auth needed)
  if (!bookMode && !session?.user && !event.url.pathname.startsWith('/auth') && event.url.pathname !== '/login') {
    throw redirect(302, '/login');
  }

  // Load book categories with sections for sidebar navigation
  let bookCategories: { id: number; name: string; slug: string; icon: string | null; seeded: number; sections: { id: number; name: string; slug: string; type: string; seeded: number }[] }[] = [];
  if (bookEnabled) {
    const db = getDb();
    const cats = db.select().from(categories).orderBy(categories.sortOrder).all();
    bookCategories = cats.map((cat) => {
      const sects = db.select({
        id: sections.id,
        name: sections.name,
        slug: sections.slug,
        type: sections.type,
        seeded: sections.seeded
      }).from(sections).where(eq(sections.categoryId, cat.id)).orderBy(sections.sortOrder).all();
      return { ...cat, sections: sects };
    });
  }

  return {
    session,
    config,
    bookEnabled,
    bookMode,
    bookCategories
  };
};
