import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  icon: text('icon').default('folder'),
  sortOrder: integer('sort_order').notNull().default(0)
});

export const sections = sqliteTable('sections', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  categoryId: integer('category_id')
    .notNull()
    .references(() => categories.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  type: text('type', { enum: ['key_value', 'table'] }).notNull().default('key_value'),
  sortOrder: integer('sort_order').notNull().default(0)
});

export const fields = sqliteTable('fields', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sectionId: integer('section_id')
    .notNull()
    .references(() => sections.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  fieldType: text('field_type', {
    enum: ['text', 'number', 'date', 'phone', 'email', 'currency', 'url', 'textarea', 'boolean']
  })
    .notNull()
    .default('text'),
  sortOrder: integer('sort_order').notNull().default(0)
});

export const records = sqliteTable('records', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sectionId: integer('section_id')
    .notNull()
    .references(() => sections.id, { onDelete: 'cascade' }),
  sortOrder: integer('sort_order').notNull().default(0)
});

export const values = sqliteTable('values', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  fieldId: integer('field_id')
    .notNull()
    .references(() => fields.id, { onDelete: 'cascade' }),
  recordId: integer('record_id').references(() => records.id, { onDelete: 'cascade' }),
  value: text('value')
});
