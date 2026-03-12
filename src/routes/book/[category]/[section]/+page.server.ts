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

  if (section.type === 'placeholder') {
    return { category, section, fields: [], records: null };
  }

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
    // Detect "who" field for person grouping (exclude Final Arrangements)
    const whoField = category.slug !== 'final-arrangements'
      ? fieldList.find((f) => f.slug === 'who')
      : undefined;

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

    return {
      category,
      section,
      fields: fieldList,
      records: recordsWithValues,
      whoFieldId: whoField?.id ?? null
    };
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
    const whoFieldId = formData.get('whoFieldId');
    const whoValue = formData.get('whoValue');

    const maxOrder = db
      .select({ max: records.sortOrder })
      .from(records)
      .where(eq(records.sectionId, sectionId))
      .get();

    const newRecord = db.insert(records)
      .values({ sectionId, sortOrder: (maxOrder?.max || 0) + 1 })
      .returning()
      .get();

    // Auto-fill "who" field if provided
    if (whoFieldId && whoValue) {
      db.insert(values)
        .values({ fieldId: Number(whoFieldId), recordId: newRecord.id, value: String(whoValue) })
        .run();
    }

    return { success: true };
  },

  renameGroup: async ({ request }) => {
    const db = getDb();
    const formData = await request.formData();
    const whoFieldId = Number(formData.get('whoFieldId'));
    const newName = String(formData.get('newName') ?? '');
    const recordIds = String(formData.get('recordIds') ?? '').split(',').map(Number).filter(Boolean);

    for (const recordId of recordIds) {
      const existing = db
        .select()
        .from(values)
        .where(and(eq(values.fieldId, whoFieldId), eq(values.recordId, recordId)))
        .get();

      if (existing) {
        db.update(values).set({ value: newName }).where(eq(values.id, existing.id)).run();
      } else {
        db.insert(values).values({ fieldId: whoFieldId, recordId, value: newName }).run();
      }
    }

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
