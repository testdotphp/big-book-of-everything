import type { PageServerLoad, Actions } from './$types';
import { getDb } from '$lib/server/db';
import { categories, sections, fields, records, values } from '$lib/server/schema';
import { eq, count, and, isNull, isNotNull } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
  const db = getDb();

  const cats = db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      icon: categories.icon,
      sortOrder: categories.sortOrder,
      seeded: categories.seeded,
      sectionCount: count(sections.id)
    })
    .from(categories)
    .leftJoin(sections, eq(sections.categoryId, categories.id))
    .groupBy(categories.id)
    .orderBy(categories.sortOrder)
    .all();

  // Count sections with data per category
  const catsWithFill = cats.map((cat) => {
    const secs = db.select().from(sections).where(eq(sections.categoryId, cat.id)).all();
    let filled = 0;
    for (const sec of secs) {
      if (sec.type === 'placeholder') {
        filled++; // Placeholders always count as filled
        continue;
      }
      if (sec.type === 'key_value') {
        const hasValue = db
          .select({ id: values.id })
          .from(values)
          .innerJoin(fields, eq(values.fieldId, fields.id))
          .where(and(eq(fields.sectionId, sec.id), isNull(values.recordId), isNotNull(values.value)))
          .limit(1)
          .get();
        if (hasValue) filled++;
      } else {
        const hasRecord = db
          .select({ id: records.id })
          .from(records)
          .where(eq(records.sectionId, sec.id))
          .limit(1)
          .get();
        if (hasRecord) filled++;
      }
    }
    return { ...cat, filledSections: filled };
  });

  return { categories: catsWithFill };
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
