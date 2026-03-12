import type { PageServerLoad, Actions } from './$types';
import { getDb } from '$lib/server/db';
import { categories, sections } from '$lib/server/schema';
import { eq, count } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
  const db = getDb();

  const cats = db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      icon: categories.icon,
      sortOrder: categories.sortOrder,
      sectionCount: count(sections.id)
    })
    .from(categories)
    .leftJoin(sections, eq(sections.categoryId, categories.id))
    .groupBy(categories.id)
    .orderBy(categories.sortOrder)
    .all();

  return { categories: cats };
};

export const actions: Actions = {
  addCategory: async ({ request }) => {
    const db = getDb();
    const formData = await request.formData();
    const name = String(formData.get('name') ?? '').trim();
    const icon = String(formData.get('icon') ?? 'folder').trim();

    if (!name) return { success: false };

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const maxOrder = db.select({ max: categories.sortOrder })
      .from(categories).get();

    db.insert(categories).values({
      name,
      slug,
      icon: icon || 'folder',
      sortOrder: (maxOrder?.max || 0) + 1
    }).run();

    return { success: true };
  }
};
