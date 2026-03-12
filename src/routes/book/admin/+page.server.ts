import type { PageServerLoad } from './$types';
import { getDb } from '$lib/server/db';
import { categories, sections, fields } from '$lib/server/schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
  const db = getDb();

  const cats = db.select().from(categories).orderBy(categories.sortOrder).all();

  const catsWithSections = cats.map((cat) => {
    const sects = db
      .select()
      .from(sections)
      .where(eq(sections.categoryId, cat.id))
      .orderBy(sections.sortOrder)
      .all();

    const sectsWithFields = sects.map((s) => {
      const flds = db
        .select()
        .from(fields)
        .where(eq(fields.sectionId, s.id))
        .orderBy(fields.sortOrder)
        .all();
      return { ...s, fields: flds };
    });

    return { ...cat, sections: sectsWithFields };
  });

  return { categories: catsWithSections };
};
