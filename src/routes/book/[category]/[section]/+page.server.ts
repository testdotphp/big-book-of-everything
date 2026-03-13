import type { PageServerLoad, Actions } from './$types';
import { getDb } from '$lib/server/db';
import { categories, sections, fields, values, records, uploads } from '$lib/server/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import { getEncryptionKey } from '$lib/server/encryption-session';
import { decrypt, isEncrypted } from '$lib/server/crypto';

function decryptValue(val: string | null | undefined): string {
  if (!val) return '';
  const key = getEncryptionKey();
  if (key && isEncrypted(val)) return decrypt(val, key);
  return val;
}

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
    const fileList = db
      .select({
        id: uploads.id,
        filename: uploads.filename,
        mimeType: uploads.mimeType,
        size: uploads.size,
        uploadedAt: uploads.uploadedAt
      })
      .from(uploads)
      .where(eq(uploads.sectionId, section.id))
      .all();

    return { category, section, fields: [], records: null, files: fileList };
  }

  const fieldList = db
    .select()
    .from(fields)
    .where(eq(fields.sectionId, section.id))
    .orderBy(fields.sortOrder)
    .all();

  if (section.type === 'key_value') {
    // Batch: get all KV values for this section's fields at once
    const fieldIds = fieldList.map(f => f.id);
    const allValues = fieldIds.length > 0
      ? db.select().from(values)
          .where(and(isNull(values.recordId)))
          .all()
          .filter(v => fieldIds.includes(v.fieldId))
      : [];
    const valueMap = new Map(allValues.map(v => [v.fieldId, v.value]));

    const fieldValues = fieldList.map((f) => ({
      ...f,
      value: decryptValue(valueMap.get(f.id))
    }));
    return { category, section, fields: fieldValues, records: null, files: [] };
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

    // Batch: get all values for all records in this section at once
    const recordIds = recordList.map(r => r.id);
    const allValues = recordIds.length > 0
      ? db.select().from(values).all()
          .filter(v => v.recordId !== null && recordIds.includes(v.recordId))
      : [];

    // Index by recordId → fieldId → value
    const valueIndex = new Map<number, Map<number, string>>();
    for (const v of allValues) {
      if (v.recordId === null) continue;
      if (!valueIndex.has(v.recordId)) valueIndex.set(v.recordId, new Map());
      valueIndex.get(v.recordId)!.set(v.fieldId, v.value || '');
    }

    const recordsWithValues = recordList.map((r) => {
      const rowValues: Record<number, string> = {};
      const rValues = valueIndex.get(r.id);
      for (const f of fieldList) {
        rowValues[f.id] = decryptValue(rValues?.get(f.id));
      }
      return { ...r, values: rowValues };
    });

    return {
      category,
      section,
      fields: fieldList,
      records: recordsWithValues,
      whoFieldId: whoField?.id ?? null,
      files: []
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
  },

  addField: async ({ request }) => {
    const db = getDb();
    const formData = await request.formData();
    const sectionId = Number(formData.get('sectionId'));
    const name = String(formData.get('name') ?? '').trim();
    const fieldType = String(formData.get('fieldType') ?? 'text') as 'text' | 'number' | 'date' | 'phone' | 'email' | 'currency' | 'url' | 'textarea' | 'boolean';

    if (!name) return { success: false };

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const maxOrder = db.select({ max: fields.sortOrder })
      .from(fields).where(eq(fields.sectionId, sectionId)).get();

    db.insert(fields).values({
      sectionId,
      name,
      slug,
      fieldType,
      sortOrder: (maxOrder?.max || 0) + 1
    }).run();

    return { success: true };
  },

  deleteField: async ({ request }) => {
    const db = getDb();
    const formData = await request.formData();
    const fieldId = Number(formData.get('fieldId'));

    db.delete(values).where(eq(values.fieldId, fieldId)).run();
    db.delete(fields).where(eq(fields.id, fieldId)).run();

    return { success: true };
  }
};
