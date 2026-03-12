import type { PageServerLoad } from './$types';
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
