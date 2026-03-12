import type { PageServerLoad, Actions } from './$types';
import { getDb } from '$lib/server/db';
import { categories, sections, fields } from '$lib/server/schema';
import { eq } from 'drizzle-orm';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

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

export const actions: Actions = {
  addCategory: async ({ request }) => {
    const db = getDb();
    const formData = await request.formData();
    const name = String(formData.get('name') ?? '').trim();
    const icon = String(formData.get('icon') ?? 'folder').trim();
    if (!name) return { error: 'Name required' };

    const maxOrder = db
      .select({ max: categories.sortOrder })
      .from(categories)
      .get();

    db.insert(categories)
      .values({ name, slug: slugify(name), icon, sortOrder: (maxOrder?.max || 0) + 1 })
      .run();

    return { success: true };
  },

  deleteCategory: async ({ request }) => {
    const db = getDb();
    const formData = await request.formData();
    const id = Number(formData.get('id'));
    db.delete(categories).where(eq(categories.id, id)).run();
    return { success: true };
  },

  addSection: async ({ request }) => {
    const db = getDb();
    const formData = await request.formData();
    const categoryId = Number(formData.get('categoryId'));
    const name = String(formData.get('name') ?? '').trim();
    const type = String(formData.get('type') ?? 'key_value');
    if (!name) return { error: 'Name required' };

    const maxOrder = db
      .select({ max: sections.sortOrder })
      .from(sections)
      .where(eq(sections.categoryId, categoryId))
      .get();

    db.insert(sections)
      .values({
        categoryId,
        name,
        slug: slugify(name),
        type: type as 'key_value' | 'table',
        sortOrder: (maxOrder?.max || 0) + 1
      })
      .run();

    return { success: true };
  },

  deleteSection: async ({ request }) => {
    const db = getDb();
    const formData = await request.formData();
    const id = Number(formData.get('id'));
    db.delete(sections).where(eq(sections.id, id)).run();
    return { success: true };
  },

  addField: async ({ request }) => {
    const db = getDb();
    const formData = await request.formData();
    const sectionId = Number(formData.get('sectionId'));
    const name = String(formData.get('name') ?? '').trim();
    const fieldType = String(formData.get('fieldType') ?? 'text');
    if (!name) return { error: 'Name required' };

    const maxOrder = db
      .select({ max: fields.sortOrder })
      .from(fields)
      .where(eq(fields.sectionId, sectionId))
      .get();

    db.insert(fields)
      .values({
        sectionId,
        name,
        slug: slugify(name),
        fieldType: fieldType as any,
        sortOrder: (maxOrder?.max || 0) + 1
      })
      .run();

    return { success: true };
  },

  deleteField: async ({ request }) => {
    const db = getDb();
    const formData = await request.formData();
    const id = Number(formData.get('id'));
    db.delete(fields).where(eq(fields.id, id)).run();
    return { success: true };
  }
};
