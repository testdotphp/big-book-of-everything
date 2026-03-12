import type { PageServerLoad, Actions } from './$types';
import { getDb } from '$lib/server/db';
import { categories, sections, fields, values, records } from '$lib/server/schema';
import { eq, count, and, isNull } from 'drizzle-orm';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
  const db = getDb();

  const category = db
    .select()
    .from(categories)
    .where(eq(categories.slug, params.category))
    .get();

  if (!category) {
    throw error(404, `Category "${params.category}" not found`);
  }

  const sectionList = db
    .select({
      id: sections.id,
      name: sections.name,
      slug: sections.slug,
      type: sections.type,
      sortOrder: sections.sortOrder,
      seeded: sections.seeded
    })
    .from(sections)
    .where(eq(sections.categoryId, category.id))
    .orderBy(sections.sortOrder)
    .all();

  // Get counts for each section
  const sectionsWithCounts = sectionList.map((s) => {
    if (s.type === 'placeholder') {
      return { ...s, itemCount: 0, totalFields: 0, itemLabel: 'info' };
    } else if (s.type === 'table') {
      const recordCount = db
        .select({ count: count() })
        .from(records)
        .where(eq(records.sectionId, s.id))
        .get();
      return { ...s, itemCount: recordCount?.count || 0, itemLabel: 'records' };
    } else {
      const filledCount = db
        .select({ count: count() })
        .from(values)
        .innerJoin(fields, eq(values.fieldId, fields.id))
        .where(and(eq(fields.sectionId, s.id), isNull(values.recordId)))
        .get();
      const totalCount = db
        .select({ count: count() })
        .from(fields)
        .where(eq(fields.sectionId, s.id))
        .get();
      return {
        ...s,
        itemCount: filledCount?.count || 0,
        totalFields: totalCount?.count || 0,
        itemLabel: 'fields'
      };
    }
  });

  return { category, sections: sectionsWithCounts };
};

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export const actions: Actions = {
  addSection: async ({ request, params }) => {
    const db = getDb();
    const formData = await request.formData();
    const name = String(formData.get('name') ?? '').trim();
    const type = String(formData.get('type') ?? 'table') as 'key_value' | 'table' | 'placeholder';

    if (!name) return { success: false };

    const category = db.select().from(categories)
      .where(eq(categories.slug, params.category)).get();
    if (!category) throw error(404, 'Category not found');

    const maxOrder = db.select({ max: sections.sortOrder })
      .from(sections).where(eq(sections.categoryId, category.id)).get();

    const slug = slugify(name);

    db.insert(sections).values({
      categoryId: category.id,
      name,
      slug,
      type,
      sortOrder: (maxOrder?.max || 0) + 1
    }).run();

    return { success: true };
  },

  deleteSection: async ({ request }) => {
    const db = getDb();
    const formData = await request.formData();
    const sectionId = Number(formData.get('sectionId'));

    // Only allow deleting non-seeded sections
    const sec = db.select().from(sections).where(eq(sections.id, sectionId)).get();
    if (sec?.seeded) return { success: false };

    // Cascade deletes handle fields, records, values
    db.delete(sections).where(eq(sections.id, sectionId)).run();

    return { success: true };
  }
};
