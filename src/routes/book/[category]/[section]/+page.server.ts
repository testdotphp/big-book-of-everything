import type { PageServerLoad, Actions } from './$types';
import { getDb } from '$lib/server/db';
import { categories, sections, fields, values, records } from '$lib/server/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
  const db = getDb();

  const category = db
    .select()
    .from(categories)
    .where(eq(categories.slug, params.category))
    .get();

  if (!category) throw error(404, 'Category not found');

  const section = db
    .select()
    .from(sections)
    .where(and(eq(sections.categoryId, category.id), eq(sections.slug, params.section)))
    .get();

  if (!section) throw error(404, 'Section not found');

  const fieldList = db
    .select()
    .from(fields)
    .where(eq(fields.sectionId, section.id))
    .orderBy(fields.sortOrder)
    .all();

  if (section.type === 'key_value') {
    const fieldValues = fieldList.map((f) => {
      const val = db
        .select()
        .from(values)
        .where(and(eq(values.fieldId, f.id), isNull(values.recordId)))
        .get();
      return { ...f, value: val?.value || '' };
    });
    return { category, section, fields: fieldValues, records: null };
  } else {
    const recordList = db
      .select()
      .from(records)
      .where(eq(records.sectionId, section.id))
      .orderBy(records.sortOrder)
      .all();

    const recordsWithValues = recordList.map((r) => {
      const rowValues: Record<number, string> = {};
      for (const f of fieldList) {
        const val = db
          .select()
          .from(values)
          .where(and(eq(values.fieldId, f.id), eq(values.recordId, r.id)))
          .get();
        rowValues[f.id] = val?.value || '';
      }
      return { ...r, values: rowValues };
    });

    return { category, section, fields: fieldList, records: recordsWithValues };
  }
};

export const actions: Actions = {
  saveKeyValue: async ({ request }) => {
    const db = getDb();
    const formData = await request.formData();
    const fieldId = Number(formData.get('fieldId'));
    const value = String(formData.get('value') ?? '');

    const existing = db
      .select()
      .from(values)
      .where(and(eq(values.fieldId, fieldId), isNull(values.recordId)))
      .get();

    if (existing) {
      db.update(values).set({ value }).where(eq(values.id, existing.id)).run();
    } else {
      db.insert(values).values({ fieldId, value, recordId: null }).run();
    }

    return { success: true };
  },

  saveTableCell: async ({ request }) => {
    const db = getDb();
    const formData = await request.formData();
    const fieldId = Number(formData.get('fieldId'));
    const recordId = Number(formData.get('recordId'));
    const value = String(formData.get('value') ?? '');

    const existing = db
      .select()
      .from(values)
      .where(and(eq(values.fieldId, fieldId), eq(values.recordId, recordId)))
      .get();

    if (existing) {
      db.update(values).set({ value }).where(eq(values.id, existing.id)).run();
    } else {
      db.insert(values).values({ fieldId, recordId, value }).run();
    }

    return { success: true };
  },

  addRecord: async ({ request }) => {
    const db = getDb();
    const formData = await request.formData();
    const sectionId = Number(formData.get('sectionId'));

    const maxOrder = db
      .select({ max: records.sortOrder })
      .from(records)
      .where(eq(records.sectionId, sectionId))
      .get();

    db.insert(records)
      .values({ sectionId, sortOrder: (maxOrder?.max || 0) + 1 })
      .run();

    return { success: true };
  },

  deleteRecord: async ({ request }) => {
    const db = getDb();
    const formData = await request.formData();
    const recordId = Number(formData.get('recordId'));

    db.delete(values).where(eq(values.recordId, recordId)).run();
    db.delete(records).where(eq(records.id, recordId)).run();

    return { success: true };
  }
};
