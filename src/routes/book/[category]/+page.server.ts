import type { PageServerLoad } from './$types';
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
      sortOrder: sections.sortOrder
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
