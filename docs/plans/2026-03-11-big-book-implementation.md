# Big Book of Everything — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Embed a family reference data app ("Big Book of Everything") into the home portal, backed by SQLite, replacing a 57-sheet spreadsheet.

**Architecture:** Extend the existing SvelteKit portal-template with new `/book` routes, a SQLite database (Drizzle ORM + better-sqlite3), and CRUD components. The feature is conditional — only active when `BOOK_DB_PATH` env var is set, so media/lab portals are unaffected.

**Tech Stack:** SvelteKit 2 / Svelte 5, Drizzle ORM, better-sqlite3, lucide-svelte icons, existing dark theme CSS variables.

---

## Task 1: Install Dependencies & Configure Drizzle

**Files:**
- Modify: `package.json`
- Create: `drizzle.config.ts`

**Step 1: Install packages**

Run:
```bash
cd /home/teedge/projects/portal-template
npm install drizzle-orm better-sqlite3
npm install -D drizzle-kit @types/better-sqlite3
```

**Step 2: Create Drizzle config**

Create `drizzle.config.ts`:

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/lib/server/schema.ts',
  out: './drizzle',
  dialect: 'sqlite'
});
```

**Step 3: Commit**

```bash
git add package.json package-lock.json drizzle.config.ts
git commit -m "feat(book): add drizzle-orm and better-sqlite3 dependencies"
```

---

## Task 2: Define Database Schema

**Files:**
- Create: `src/lib/server/schema.ts`

**Step 1: Write the schema**

Create `src/lib/server/schema.ts`:

```typescript
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
```

**Step 2: Generate initial migration**

Run:
```bash
npx drizzle-kit generate
```

Expected: Creates `drizzle/0000_*.sql` migration file.

**Step 3: Commit**

```bash
git add src/lib/server/schema.ts drizzle/
git commit -m "feat(book): define database schema for categories, sections, fields, records, values"
```

---

## Task 3: Database Connection Module

**Files:**
- Create: `src/lib/server/db.ts`

**Step 1: Write the database module**

Create `src/lib/server/db.ts`:

```typescript
import { env } from '$env/dynamic/private';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema';
import { resolve } from 'path';

let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function isBookEnabled(): boolean {
  return !!env.BOOK_DB_PATH;
}

export function getDb() {
  if (!isBookEnabled()) {
    throw new Error('Big Book is not enabled (BOOK_DB_PATH not set)');
  }

  if (!db) {
    const dbPath = env.BOOK_DB_PATH!;
    const sqlite = new Database(dbPath);
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');

    db = drizzle(sqlite, { schema });

    // Run migrations on first connection
    migrate(db, { migrationsFolder: resolve('drizzle') });
  }

  return db;
}
```

**Step 2: Commit**

```bash
git add src/lib/server/db.ts
git commit -m "feat(book): add SQLite connection module with auto-migration"
```

---

## Task 4: Sidebar Integration — Inject Big Book Nav Item

The sidebar currently renders items from `config.items` (loaded from JSON). When `BOOK_DB_PATH` is set, inject a "Big Book" nav item at runtime so it appears in the sidebar without modifying the JSON config file.

**Files:**
- Modify: `src/routes/+layout.server.ts`
- Modify: `src/lib/components/Sidebar.svelte`
- Modify: `src/lib/components/NavItem.svelte`

**Step 1: Add `bookEnabled` flag to layout data**

Modify `src/routes/+layout.server.ts`:

```typescript
import type { LayoutServerLoad } from './$types';
import { getPortalConfig } from '$lib/server/config';
import { isBookEnabled } from '$lib/server/db';
import { redirect } from '@sveltejs/kit';

export const load: LayoutServerLoad = async (event) => {
  const session = await event.locals.auth?.();
  const config = getPortalConfig();

  if (!session?.user && !event.url.pathname.startsWith('/auth') && event.url.pathname !== '/login') {
    throw redirect(302, '/login');
  }

  return {
    session,
    config,
    bookEnabled: isBookEnabled()
  };
};
```

**Step 2: Add Big Book link to Sidebar**

In `src/lib/components/Sidebar.svelte`, add a `bookEnabled` prop and render a Big Book nav item before the other nav items. The Big Book item links to `/book` instead of `/app/[slug]`.

Add to the Props interface:
```typescript
bookEnabled?: boolean;
```

Add before the `{#each config.items as item}` loop in the nav section:
```svelte
{#if bookEnabled}
  <a
    href="/book"
    class="nav-item book-item"
    class:active={$page.url.pathname.startsWith('/book')}
    class:collapsed
    title={collapsed ? 'Big Book' : undefined}
  >
    <span class="icon" class:active={$page.url.pathname.startsWith('/book')}>
      <Icon name="book-open" size={18} />
    </span>
    {#if !collapsed}
      <span class="label">Big Book</span>
    {/if}
    {#if $page.url.pathname.startsWith('/book') && !collapsed}
      <span class="active-dot"></span>
    {/if}
  </a>
{/if}
```

Style the `.book-item` class identically to NavItem styles (copy from NavItem.svelte — same `.nav-item`, `.active`, `.collapsed`, `.icon`, `.label`, `.active-dot` styles).

**Step 3: Pass bookEnabled from layout to Sidebar**

In `src/routes/+layout.svelte`, pass the new prop:

```svelte
<Sidebar
  config={data.config}
  user={data.session.user}
  bind:collapsed={sidebarCollapsed}
  bookEnabled={data.bookEnabled}
/>
```

**Step 4: Verify**

Run: `npm run dev`

With `BOOK_DB_PATH` unset: sidebar should look identical to before.
With `BOOK_DB_PATH=/tmp/test-book.db`: "Big Book" item should appear at the top of the sidebar.

**Step 5: Commit**

```bash
git add src/routes/+layout.server.ts src/routes/+layout.svelte src/lib/components/Sidebar.svelte
git commit -m "feat(book): inject Big Book sidebar item when BOOK_DB_PATH is set"
```

---

## Task 5: Category Grid Page (`/book`)

**Files:**
- Create: `src/routes/book/+layout.server.ts`
- Create: `src/routes/book/+layout.svelte`
- Create: `src/routes/book/+page.server.ts`
- Create: `src/routes/book/+page.svelte`

**Step 1: Book layout guard**

Create `src/routes/book/+layout.server.ts` — returns 404 if book not enabled:

```typescript
import type { LayoutServerLoad } from './$types';
import { isBookEnabled } from '$lib/server/db';
import { error } from '@sveltejs/kit';

export const load: LayoutServerLoad = async () => {
  if (!isBookEnabled()) {
    throw error(404, 'Not found');
  }
};
```

**Step 2: Book layout wrapper**

Create `src/routes/book/+layout.svelte` — provides scrollable content area (unlike iframe pages which are full-height overflow:hidden):

```svelte
<script lang="ts">
  let { children } = $props();
</script>

<div class="book-content">
  {@render children()}
</div>

<style>
  .book-content {
    height: 100vh;
    overflow-y: auto;
    padding: 32px 40px;
  }

  .book-content::-webkit-scrollbar {
    width: 6px;
  }
  .book-content::-webkit-scrollbar-track {
    background: transparent;
  }
  .book-content::-webkit-scrollbar-thumb {
    background: var(--border-color);
    border-radius: 3px;
  }
</style>
```

**Step 3: Category list loader**

Create `src/routes/book/+page.server.ts`:

```typescript
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
```

**Step 4: Category grid UI**

Create `src/routes/book/+page.svelte`:

```svelte
<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>Big Book | {data.config?.name || 'Portal'}</title>
</svelte:head>

<div class="header">
  <h1>Big Book of Everything</h1>
  <p class="subtitle">{data.categories.length} categories</p>
</div>

<div class="grid">
  {#each data.categories as cat}
    <a href="/book/{cat.slug}" class="card">
      <div class="card-icon">
        <Icon name={cat.icon || 'folder'} size={24} />
      </div>
      <div class="card-body">
        <h2>{cat.name}</h2>
        <span class="card-count">{cat.sectionCount} {cat.sectionCount === 1 ? 'section' : 'sections'}</span>
      </div>
    </a>
  {/each}
</div>

<style>
  .header {
    margin-bottom: 32px;
  }

  h1 {
    font-family: var(--font-display);
    font-size: 24px;
    font-weight: 700;
    letter-spacing: -0.03em;
    color: var(--text-primary);
  }

  .subtitle {
    font-size: 14px;
    color: var(--text-muted);
    margin-top: 4px;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 16px;
  }

  .card {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 20px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    transition: background 0.15s, border-color 0.15s;
    cursor: pointer;
  }

  .card:hover {
    background: var(--bg-elevated);
    border-color: color-mix(in srgb, var(--theme-color) 20%, transparent);
  }

  .card-icon {
    width: 48px;
    height: 48px;
    border-radius: var(--radius-md);
    background: color-mix(in srgb, var(--theme-color) 10%, var(--bg-elevated));
    color: var(--theme-color);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .card-body {
    min-width: 0;
  }

  h2 {
    font-family: var(--font-display);
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary);
    letter-spacing: -0.01em;
  }

  .card-count {
    font-size: 13px;
    color: var(--text-muted);
  }
</style>
```

**Step 5: Verify**

Run: `BOOK_DB_PATH=/tmp/test-book.db npm run dev`

Navigate to `http://localhost:3000/book`. Should see the header with "Big Book of Everything" and an empty grid (no categories yet).

**Step 6: Commit**

```bash
git add src/routes/book/
git commit -m "feat(book): add category grid page at /book"
```

---

## Task 6: Section List Page (`/book/[category]`)

**Files:**
- Create: `src/routes/book/[category]/+page.server.ts`
- Create: `src/routes/book/[category]/+page.svelte`

**Step 1: Section list loader**

Create `src/routes/book/[category]/+page.server.ts`:

```typescript
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
    if (s.type === 'table') {
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
```

**Step 2: Section list UI**

Create `src/routes/book/[category]/+page.svelte`:

```svelte
<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import { ChevronRight } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>{data.category.name} | Big Book</title>
</svelte:head>

<nav class="breadcrumb">
  <a href="/book">Big Book</a>
  <ChevronRight size={14} strokeWidth={2} />
  <span>{data.category.name}</span>
</nav>

<div class="header">
  <div class="header-icon">
    <Icon name={data.category.icon || 'folder'} size={22} />
  </div>
  <div>
    <h1>{data.category.name}</h1>
    <p class="subtitle">{data.sections.length} {data.sections.length === 1 ? 'section' : 'sections'}</p>
  </div>
</div>

{#if data.sections.length === 0}
  <p class="empty">No sections yet.</p>
{:else}
  <div class="section-list">
    {#each data.sections as section}
      <a href="/book/{data.category.slug}/{section.slug}" class="section-row">
        <div class="section-info">
          <span class="section-name">{section.name}</span>
          <span class="section-meta">
            {#if section.type === 'table'}
              {section.itemCount} {section.itemCount === 1 ? 'record' : 'records'}
            {:else}
              {section.itemCount}/{section.totalFields} fields
            {/if}
          </span>
        </div>
        <span class="section-type">{section.type === 'table' ? 'Table' : 'Key-Value'}</span>
        <ChevronRight size={16} strokeWidth={2} />
      </a>
    {/each}
  </div>
{/if}

<style>
  .breadcrumb {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--text-muted);
    margin-bottom: 24px;
  }

  .breadcrumb a {
    color: var(--text-secondary);
    transition: color 0.15s;
  }

  .breadcrumb a:hover {
    color: var(--theme-color);
  }

  .header {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 28px;
  }

  .header-icon {
    width: 44px;
    height: 44px;
    border-radius: var(--radius-md);
    background: color-mix(in srgb, var(--theme-color) 10%, var(--bg-elevated));
    color: var(--theme-color);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  h1 {
    font-family: var(--font-display);
    font-size: 20px;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--text-primary);
  }

  .subtitle {
    font-size: 13px;
    color: var(--text-muted);
    margin-top: 2px;
  }

  .empty {
    color: var(--text-muted);
    font-size: 14px;
  }

  .section-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .section-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    transition: background 0.15s, border-color 0.15s;
    cursor: pointer;
    color: var(--text-secondary);
  }

  .section-row:hover {
    background: var(--bg-elevated);
    border-color: color-mix(in srgb, var(--theme-color) 20%, transparent);
  }

  .section-info {
    flex: 1;
    min-width: 0;
  }

  .section-name {
    font-family: var(--font-display);
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    display: block;
  }

  .section-meta {
    font-size: 12px;
    color: var(--text-muted);
    margin-top: 2px;
    display: block;
  }

  .section-type {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted);
    background: var(--bg-primary);
    padding: 3px 8px;
    border-radius: var(--radius-sm);
    flex-shrink: 0;
  }
</style>
```

**Step 3: Commit**

```bash
git add src/routes/book/\[category\]/
git commit -m "feat(book): add section list page at /book/[category]"
```

---

## Task 7: Section Detail — Key-Value Editor

**Files:**
- Create: `src/routes/book/[category]/[section]/+page.server.ts`
- Create: `src/routes/book/[category]/[section]/+page.svelte`
- Create: `src/lib/components/KeyValueEditor.svelte`

**Step 1: Section detail loader + form actions**

Create `src/routes/book/[category]/[section]/+page.server.ts`:

```typescript
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
    // Key-value: one value per field, no record
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
    // Table: multiple records, each with values for each field
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
```

**Step 2: Key-value editor component**

Create `src/lib/components/KeyValueEditor.svelte`:

```svelte
<script lang="ts">
  import { enhance } from '$app/forms';

  interface FieldWithValue {
    id: number;
    name: string;
    slug: string;
    fieldType: string;
    value: string;
  }

  interface Props {
    fields: FieldWithValue[];
  }

  let { fields }: Props = $props();

  function inputType(fieldType: string): string {
    switch (fieldType) {
      case 'number':
      case 'currency':
        return 'number';
      case 'date':
        return 'date';
      case 'phone':
        return 'tel';
      case 'email':
        return 'email';
      case 'url':
        return 'url';
      default:
        return 'text';
    }
  }
</script>

<div class="kv-editor">
  {#each fields as field}
    <form
      method="POST"
      action="?/saveKeyValue"
      use:enhance={() => {
        return async ({ update }) => {
          await update({ reset: false, invalidateAll: false });
        };
      }}
      class="kv-row"
    >
      <input type="hidden" name="fieldId" value={field.id} />
      <label class="kv-label" for="field-{field.id}">{field.name}</label>
      {#if field.fieldType === 'textarea'}
        <textarea
          id="field-{field.id}"
          name="value"
          class="kv-input textarea"
          value={field.value}
          onblur="this.form.requestSubmit()"
          rows="3"
        ></textarea>
      {:else if field.fieldType === 'boolean'}
        <label class="kv-toggle">
          <input
            type="checkbox"
            name="value"
            value="true"
            checked={field.value === 'true'}
            onchange="this.form.requestSubmit()"
          />
          <span>{field.value === 'true' ? 'Yes' : 'No'}</span>
        </label>
      {:else}
        <input
          id="field-{field.id}"
          name="value"
          type={inputType(field.fieldType)}
          class="kv-input"
          value={field.value}
          onblur="this.form.requestSubmit()"
          step={field.fieldType === 'currency' ? '0.01' : undefined}
          placeholder={field.fieldType === 'phone' ? '(555) 555-5555' : ''}
        />
      {/if}
      {#if field.fieldType === 'currency' && field.value}
        <span class="kv-prefix">$</span>
      {/if}
    </form>
  {/each}
</div>

<style>
  .kv-editor {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .kv-row {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 12px 16px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    position: relative;
  }

  .kv-label {
    font-family: var(--font-display);
    font-size: 13px;
    font-weight: 600;
    color: var(--text-secondary);
    min-width: 160px;
    flex-shrink: 0;
  }

  .kv-input {
    flex: 1;
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-family: var(--font-body);
    font-size: 13px;
    padding: 8px 12px;
    transition: border-color 0.15s;
  }

  .kv-input:focus {
    outline: none;
    border-color: var(--theme-color);
  }

  .kv-input.textarea {
    resize: vertical;
    min-height: 60px;
  }

  .kv-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: var(--text-primary);
    cursor: pointer;
  }

  .kv-prefix {
    position: absolute;
    right: 32px;
    font-size: 13px;
    color: var(--text-muted);
  }
</style>
```

**Step 3: Section detail page**

Create `src/routes/book/[category]/[section]/+page.svelte`:

```svelte
<script lang="ts">
  import { enhance } from '$app/forms';
  import Icon from '$lib/components/Icon.svelte';
  import KeyValueEditor from '$lib/components/KeyValueEditor.svelte';
  import { ChevronRight, Plus, Trash2 } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>{data.section.name} | Big Book</title>
</svelte:head>

<nav class="breadcrumb">
  <a href="/book">Big Book</a>
  <ChevronRight size={14} strokeWidth={2} />
  <a href="/book/{data.category.slug}">{data.category.name}</a>
  <ChevronRight size={14} strokeWidth={2} />
  <span>{data.section.name}</span>
</nav>

<div class="header">
  <h1>{data.section.name}</h1>
  <span class="type-badge">{data.section.type === 'table' ? 'Table' : 'Key-Value'}</span>
</div>

{#if data.section.type === 'key_value' && data.fields}
  <KeyValueEditor fields={data.fields} />
{:else if data.section.type === 'table' && data.records !== null}
  {#if data.fields.length === 0}
    <p class="empty">No fields defined for this section.</p>
  {:else}
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            {#each data.fields as field}
              <th>{field.name}</th>
            {/each}
            <th class="actions-col"></th>
          </tr>
        </thead>
        <tbody>
          {#each data.records as record}
            <tr>
              {#each data.fields as field}
                <td>
                  <form
                    method="POST"
                    action="?/saveTableCell"
                    use:enhance={() => {
                      return async ({ update }) => {
                        await update({ reset: false, invalidateAll: false });
                      };
                    }}
                  >
                    <input type="hidden" name="fieldId" value={field.id} />
                    <input type="hidden" name="recordId" value={record.id} />
                    <input
                      name="value"
                      type="text"
                      class="cell-input"
                      value={record.values[field.id] || ''}
                      onblur="this.form.requestSubmit()"
                    />
                  </form>
                </td>
              {/each}
              <td class="actions-col">
                <form method="POST" action="?/deleteRecord" use:enhance>
                  <input type="hidden" name="recordId" value={record.id} />
                  <button type="submit" class="delete-btn" title="Delete row">
                    <Trash2 size={14} strokeWidth={1.75} />
                  </button>
                </form>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <form method="POST" action="?/addRecord" use:enhance>
      <input type="hidden" name="sectionId" value={data.section.id} />
      <button type="submit" class="add-row-btn">
        <Plus size={14} strokeWidth={2} />
        Add row
      </button>
    </form>
  {/if}
{/if}

<style>
  .breadcrumb {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--text-muted);
    margin-bottom: 24px;
  }

  .breadcrumb a {
    color: var(--text-secondary);
    transition: color 0.15s;
  }

  .breadcrumb a:hover {
    color: var(--theme-color);
  }

  .header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 24px;
  }

  h1 {
    font-family: var(--font-display);
    font-size: 20px;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--text-primary);
  }

  .type-badge {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted);
    background: var(--bg-secondary);
    padding: 3px 8px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-color);
  }

  .empty {
    color: var(--text-muted);
    font-size: 14px;
  }

  .table-wrapper {
    overflow-x: auto;
    margin-bottom: 12px;
  }

  table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    overflow: hidden;
  }

  th {
    text-align: left;
    padding: 10px 14px;
    font-family: var(--font-display);
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text-muted);
    background: var(--bg-primary);
    border-bottom: 1px solid var(--border-color);
  }

  td {
    padding: 2px 4px;
    border-bottom: 1px solid var(--border-subtle);
  }

  tr:last-child td {
    border-bottom: none;
  }

  .cell-input {
    width: 100%;
    background: transparent;
    border: 1px solid transparent;
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-family: var(--font-body);
    font-size: 13px;
    padding: 8px 10px;
    transition: border-color 0.15s, background 0.15s;
  }

  .cell-input:focus {
    outline: none;
    border-color: var(--theme-color);
    background: var(--bg-primary);
  }

  .cell-input:hover {
    background: var(--bg-primary);
  }

  .actions-col {
    width: 40px;
    text-align: center;
  }

  .delete-btn {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 6px;
    border-radius: var(--radius-sm);
    display: inline-flex;
    transition: color 0.15s, background 0.15s;
  }

  .delete-btn:hover {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
  }

  .add-row-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    background: var(--bg-secondary);
    border: 1px dashed var(--border-color);
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    font-family: var(--font-body);
    font-size: 13px;
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s;
  }

  .add-row-btn:hover {
    border-color: var(--theme-color);
    color: var(--theme-color);
  }
</style>
```

**Step 4: Verify**

Run: `BOOK_DB_PATH=/tmp/test-book.db npm run dev`

Navigate to `/book`. The grid should be empty. We'll seed data in Task 9.

**Step 5: Commit**

```bash
git add src/routes/book/\[category\]/\[section\]/ src/lib/components/KeyValueEditor.svelte
git commit -m "feat(book): add section detail page with key-value and table editors"
```

---

## Task 8: Admin UI — Manage Categories, Sections, and Fields

**Files:**
- Create: `src/routes/book/admin/+page.server.ts`
- Create: `src/routes/book/admin/+page.svelte`

**Step 1: Admin loader + actions**

Create `src/routes/book/admin/+page.server.ts`:

```typescript
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
```

**Step 2: Admin UI**

Create `src/routes/book/admin/+page.svelte`:

```svelte
<script lang="ts">
  import { enhance } from '$app/forms';
  import { ChevronRight, Plus, Trash2, Settings } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const fieldTypes = [
    'text', 'number', 'date', 'phone', 'email', 'currency', 'url', 'textarea', 'boolean'
  ];
</script>

<svelte:head>
  <title>Admin | Big Book</title>
</svelte:head>

<nav class="breadcrumb">
  <a href="/book">Big Book</a>
  <ChevronRight size={14} strokeWidth={2} />
  <span>Admin</span>
</nav>

<h1>Manage Structure</h1>

<!-- Add Category -->
<form method="POST" action="?/addCategory" use:enhance class="add-form">
  <input name="name" placeholder="New category name" required class="input" />
  <input name="icon" placeholder="Icon (e.g. folder)" value="folder" class="input small" />
  <button type="submit" class="btn"><Plus size={14} /> Add Category</button>
</form>

{#each data.categories as cat}
  <div class="category-block">
    <div class="category-header">
      <h2>{cat.name}</h2>
      <form method="POST" action="?/deleteCategory" use:enhance class="inline">
        <input type="hidden" name="id" value={cat.id} />
        <button type="submit" class="delete-btn" title="Delete category">
          <Trash2 size={14} />
        </button>
      </form>
    </div>

    <!-- Add Section -->
    <form method="POST" action="?/addSection" use:enhance class="add-form nested">
      <input type="hidden" name="categoryId" value={cat.id} />
      <input name="name" placeholder="New section name" required class="input" />
      <select name="type" class="input small">
        <option value="key_value">Key-Value</option>
        <option value="table">Table</option>
      </select>
      <button type="submit" class="btn small"><Plus size={14} /> Section</button>
    </form>

    {#each cat.sections as section}
      <div class="section-block">
        <div class="section-header">
          <span class="section-name">{section.name}</span>
          <span class="section-type">{section.type}</span>
          <form method="POST" action="?/deleteSection" use:enhance class="inline">
            <input type="hidden" name="id" value={section.id} />
            <button type="submit" class="delete-btn"><Trash2 size={12} /></button>
          </form>
        </div>

        <!-- Fields -->
        {#each section.fields as field}
          <div class="field-row">
            <span class="field-name">{field.name}</span>
            <span class="field-type">{field.fieldType}</span>
            <form method="POST" action="?/deleteField" use:enhance class="inline">
              <input type="hidden" name="id" value={field.id} />
              <button type="submit" class="delete-btn"><Trash2 size={12} /></button>
            </form>
          </div>
        {/each}

        <!-- Add Field -->
        <form method="POST" action="?/addField" use:enhance class="add-form field-form">
          <input type="hidden" name="sectionId" value={section.id} />
          <input name="name" placeholder="Field name" required class="input small" />
          <select name="fieldType" class="input small">
            {#each fieldTypes as ft}
              <option value={ft}>{ft}</option>
            {/each}
          </select>
          <button type="submit" class="btn small"><Plus size={12} /> Field</button>
        </form>
      </div>
    {/each}
  </div>
{/each}

<style>
  h1 {
    font-family: var(--font-display);
    font-size: 20px;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 24px;
  }

  h2 {
    font-family: var(--font-display);
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .breadcrumb {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--text-muted);
    margin-bottom: 24px;
  }

  .breadcrumb a {
    color: var(--text-secondary);
    transition: color 0.15s;
  }

  .breadcrumb a:hover {
    color: var(--theme-color);
  }

  .category-block {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    padding: 20px;
    margin-bottom: 16px;
  }

  .category-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  .section-block {
    background: var(--bg-primary);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    padding: 14px;
    margin-bottom: 8px;
  }

  .section-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
  }

  .section-name {
    font-family: var(--font-display);
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    flex: 1;
  }

  .section-type {
    font-size: 11px;
    text-transform: uppercase;
    color: var(--text-muted);
    background: var(--bg-secondary);
    padding: 2px 6px;
    border-radius: var(--radius-sm);
  }

  .field-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 10px;
    border-radius: var(--radius-sm);
  }

  .field-row:hover {
    background: var(--bg-hover);
  }

  .field-name {
    font-size: 13px;
    color: var(--text-secondary);
    flex: 1;
  }

  .field-type {
    font-size: 11px;
    color: var(--text-muted);
    background: var(--bg-secondary);
    padding: 2px 6px;
    border-radius: var(--radius-sm);
  }

  .add-form {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-bottom: 16px;
  }

  .add-form.nested {
    margin-bottom: 12px;
  }

  .add-form.field-form {
    margin-bottom: 0;
    margin-top: 8px;
  }

  .input {
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-family: var(--font-body);
    font-size: 13px;
    padding: 7px 10px;
    flex: 1;
  }

  .input.small {
    flex: 0 0 auto;
    width: auto;
    min-width: 100px;
  }

  .input:focus {
    outline: none;
    border-color: var(--theme-color);
  }

  select.input {
    cursor: pointer;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 7px 14px;
    background: color-mix(in srgb, var(--theme-color) 15%, var(--bg-elevated));
    border: 1px solid color-mix(in srgb, var(--theme-color) 25%, transparent);
    border-radius: var(--radius-sm);
    color: var(--theme-color);
    font-family: var(--font-body);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.15s;
  }

  .btn:hover {
    background: color-mix(in srgb, var(--theme-color) 25%, var(--bg-elevated));
  }

  .btn.small {
    padding: 5px 10px;
    font-size: 12px;
  }

  .inline {
    display: inline;
  }

  .delete-btn {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 4px;
    border-radius: var(--radius-sm);
    display: inline-flex;
    transition: color 0.15s, background 0.15s;
  }

  .delete-btn:hover {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
  }
</style>
```

**Step 3: Add admin link to category grid page**

In `src/routes/book/+page.svelte`, add a gear icon link in the header that goes to `/book/admin`:

Add import at the top:
```svelte
import { Settings } from 'lucide-svelte';
```

Add to the `.header` div after the subtitle:
```svelte
<a href="/book/admin" class="admin-link" title="Manage structure">
  <Settings size={18} strokeWidth={1.75} />
</a>
```

Add style:
```css
.admin-link {
  margin-left: auto;
  color: var(--text-muted);
  padding: 6px;
  border-radius: var(--radius-sm);
  display: flex;
  transition: color 0.15s, background 0.15s;
}

.admin-link:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}
```

**Step 4: Commit**

```bash
git add src/routes/book/admin/ src/routes/book/+page.svelte
git commit -m "feat(book): add admin UI for managing categories, sections, and fields"
```

---

## Task 9: Spreadsheet Import Script

**Files:**
- Create: `scripts/import_spreadsheet.py`

**Step 1: Write the import script**

This script reads the spreadsheet, analyzes each sheet's structure, and populates the SQLite database. It needs to be run in a Python environment with `openpyxl` installed.

Create `scripts/import_spreadsheet.py`:

```python
#!/usr/bin/env python3
"""Import Big Book of Everything spreadsheet into SQLite database."""

import sqlite3
import sys
import re
from pathlib import Path

try:
    from openpyxl import load_workbook
except ImportError:
    print("Install openpyxl: pip install openpyxl")
    sys.exit(1)

# Category mapping: category_name -> list of sheet name patterns
CATEGORY_MAP = {
    "Personal Info": [],
    "Finances": [],
    "Insurance": [],
    "Medical": [],
    "Home & Property": [],
    "Legal & Estate": [],
    "Digital": [],
    "Education": [],
    "Employment": [],
    "Misc": [],
}

# Icons for categories
CATEGORY_ICONS = {
    "Personal Info": "user",
    "Finances": "dollar-sign",
    "Insurance": "shield",
    "Medical": "heart-pulse",
    "Home & Property": "home",
    "Legal & Estate": "scroll-text",
    "Digital": "monitor",
    "Education": "book-open",
    "Employment": "clipboard",
    "Misc": "layout",
}


def slugify(text: str) -> str:
    return re.sub(r"(^-|-$)", "", re.sub(r"[^a-z0-9]+", "-", text.lower()))


def detect_type(sheet) -> str:
    """Heuristic: if first column looks like labels and second like values, it's key-value."""
    rows = list(sheet.iter_rows(min_row=1, max_row=min(20, sheet.max_row or 1), values_only=True))
    if len(rows) < 2:
        return "key_value"

    # Check if first row looks like headers (all strings)
    first_row = rows[0]
    if first_row and all(isinstance(c, str) for c in first_row if c is not None):
        # Count data rows
        data_rows = [r for r in rows[1:] if any(c is not None for c in r)]
        if len(data_rows) > 1:
            return "table"

    return "key_value"


def import_sheet(conn, sheet, section_id, section_type):
    """Import data from a sheet into the database."""
    cursor = conn.cursor()
    rows = list(sheet.iter_rows(values_only=True))

    if not rows:
        return

    if section_type == "table":
        # First row = headers = field definitions
        headers = [str(h).strip() if h else f"Column {i+1}" for i, h in enumerate(rows[0])]
        # Filter out empty columns
        col_indices = [i for i, h in enumerate(rows[0]) if h is not None]

        field_ids = {}
        for order, col_idx in enumerate(col_indices):
            name = headers[col_idx]
            slug = slugify(name)
            if not slug:
                slug = f"col-{order}"
            cursor.execute(
                "INSERT INTO fields (section_id, name, slug, field_type, sort_order) VALUES (?, ?, ?, 'text', ?)",
                (section_id, name, slug, order),
            )
            field_ids[col_idx] = cursor.lastrowid

        # Data rows
        for row_order, row in enumerate(rows[1:]):
            if not any(row[i] for i in col_indices if i < len(row)):
                continue
            cursor.execute(
                "INSERT INTO records (section_id, sort_order) VALUES (?, ?)",
                (section_id, row_order),
            )
            record_id = cursor.lastrowid
            for col_idx in col_indices:
                val = row[col_idx] if col_idx < len(row) else None
                if val is not None:
                    cursor.execute(
                        "INSERT INTO values (field_id, record_id, value) VALUES (?, ?, ?)",
                        (field_ids[col_idx], record_id, str(val)),
                    )
    else:
        # Key-value: each row is label + value
        for order, row in enumerate(rows):
            if not row or row[0] is None:
                continue
            label = str(row[0]).strip()
            if not label:
                continue
            slug = slugify(label)
            if not slug:
                slug = f"field-{order}"

            cursor.execute(
                "INSERT INTO fields (section_id, name, slug, field_type, sort_order) VALUES (?, ?, ?, 'text', ?)",
                (section_id, label, slug, order),
            )
            field_id = cursor.lastrowid

            value = str(row[1]).strip() if len(row) > 1 and row[1] is not None else ""
            if value:
                cursor.execute(
                    "INSERT INTO values (field_id, record_id, value) VALUES (?, NULL, ?)",
                    (field_id, value),
                )

    conn.commit()


def main():
    if len(sys.argv) < 3:
        print(f"Usage: {sys.argv[0]} <spreadsheet.xlsx> <output.db>")
        sys.exit(1)

    xlsx_path = sys.argv[1]
    db_path = sys.argv[2]

    wb = load_workbook(xlsx_path, data_only=True)

    # Create database with schema
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")

    # Create tables
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            slug TEXT NOT NULL UNIQUE,
            icon TEXT DEFAULT 'folder',
            sort_order INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS sections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            slug TEXT NOT NULL,
            type TEXT NOT NULL DEFAULT 'key_value',
            sort_order INTEGER NOT NULL DEFAULT 0,
            UNIQUE(category_id, slug)
        );
        CREATE TABLE IF NOT EXISTS fields (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            section_id INTEGER NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            slug TEXT NOT NULL,
            field_type TEXT NOT NULL DEFAULT 'text',
            sort_order INTEGER NOT NULL DEFAULT 0,
            UNIQUE(section_id, slug)
        );
        CREATE TABLE IF NOT EXISTS records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            section_id INTEGER NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
            sort_order INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS "values" (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            field_id INTEGER NOT NULL REFERENCES fields(id) ON DELETE CASCADE,
            record_id INTEGER REFERENCES records(id) ON DELETE CASCADE,
            value TEXT
        );
    """)

    # For initial import, put each sheet as its own section under a "Misc" category.
    # The user can reorganize via the admin UI after import.
    print(f"Found {len(wb.sheetnames)} sheets: {', '.join(wb.sheetnames)}")

    # Create one category per logical group, or just import everything flat
    # For now: create a single "Imported" category, user reorganizes via admin
    cursor = conn.cursor()

    # Auto-categorize based on sheet names
    keyword_map = {
        "Personal Info": ["personal", "family", "emergency", "contact", "member"],
        "Finances": ["bank", "credit", "invest", "retire", "debt", "budget", "financial", "account", "loan", "mortgage"],
        "Insurance": ["insurance", "policy", "coverage"],
        "Medical": ["medical", "doctor", "medication", "allerg", "health", "immuniz", "pharmacy", "dental", "vision"],
        "Home & Property": ["home", "house", "property", "maintenance", "warranty", "appliance", "vehicle", "auto", "car"],
        "Legal & Estate": ["will", "trust", "estate", "legal", "attorney", "power of attorney", "beneficiar", "document"],
        "Digital": ["online", "digital", "subscription", "software", "license", "password", "website", "email"],
        "Education": ["school", "education", "transcript", "certif", "degree", "college"],
        "Employment": ["employ", "job", "work", "career", "benefit", "salary", "resume"],
    }

    # Create all categories
    cat_ids = {}
    for order, (cat_name, icon) in enumerate(
        [(k, CATEGORY_ICONS.get(k, "folder")) for k in CATEGORY_MAP]
    ):
        cursor.execute(
            "INSERT INTO categories (name, slug, icon, sort_order) VALUES (?, ?, ?, ?)",
            (cat_name, slugify(cat_name), icon, order),
        )
        cat_ids[cat_name] = cursor.lastrowid

    conn.commit()

    # Assign sheets to categories
    for sheet_order, sheet_name in enumerate(wb.sheetnames):
        sheet = wb[sheet_name]
        if sheet.max_row is None or sheet.max_row < 1:
            continue

        # Find matching category
        assigned_cat = "Misc"
        sheet_lower = sheet_name.lower()
        for cat_name, keywords in keyword_map.items():
            if any(kw in sheet_lower for kw in keywords):
                assigned_cat = cat_name
                break

        section_type = detect_type(sheet)

        cursor.execute(
            "INSERT INTO sections (category_id, name, slug, type, sort_order) VALUES (?, ?, ?, ?, ?)",
            (cat_ids[assigned_cat], sheet_name, slugify(sheet_name), section_type, sheet_order),
        )
        section_id = cursor.lastrowid

        import_sheet(conn, sheet, section_id, section_type)
        print(f"  [{assigned_cat}] {sheet_name} ({section_type}, {sheet.max_row} rows)")

    conn.close()
    print(f"\nDone. Database written to {db_path}")


if __name__ == "__main__":
    main()
```

**Step 2: Run the import**

```bash
cd /home/teedge/projects/portal-template
source /tmp/xlsx-env/bin/activate  # or create new venv with openpyxl
python scripts/import_spreadsheet.py /home/teedge/Downloads/bigbookmkIV.xlsx /tmp/test-book.db
```

Expected: Prints each sheet and its assigned category. Creates `/tmp/test-book.db`.

**Step 3: Verify data loaded**

```bash
sqlite3 /tmp/test-book.db "SELECT c.name, COUNT(s.id) FROM categories c LEFT JOIN sections s ON s.category_id = c.id GROUP BY c.id ORDER BY c.sort_order;"
```

Expected: Shows each category with section counts.

**Step 4: Verify in browser**

Run: `BOOK_DB_PATH=/tmp/test-book.db npm run dev`

Navigate to `http://localhost:3000/book`. Should see category cards with section counts. Click through to sections and see imported data.

**Step 5: Commit**

```bash
git add scripts/import_spreadsheet.py
git commit -m "feat(book): add spreadsheet import script for initial data seeding"
```

---

## Task 10: Icon Map Update

The `Icon.svelte` component needs the `User`, `Folder`, and `Scissors` icons added (used by category icons in the Big Book).

**Files:**
- Modify: `src/lib/components/Icon.svelte`

**Step 1: Add missing icons**

Add these imports to `Icon.svelte`:

```typescript
import { ..., User, Folder } from 'lucide-svelte';
```

Add to `iconMap`:

```typescript
'user': User,
'folder': Folder,
```

**Step 2: Commit**

```bash
git add src/lib/components/Icon.svelte
git commit -m "feat(book): add user and folder icons to icon map"
```

---

## Task 11: Deployment — Update Docker Compose & Dockerfile

**Files:**
- Modify: `deploy/docker-compose.portals.yml`
- Modify: `Dockerfile`

**Step 1: Update Dockerfile**

The Dockerfile needs to copy the `drizzle/` migration folder into the build output:

Add after the `COPY --from=builder /app/node_modules ./node_modules` line:

```dockerfile
COPY --from=builder /app/drizzle ./drizzle
```

**Step 2: Update docker-compose for home-portal only**

Add to the `home-portal` service in `deploy/docker-compose.portals.yml`:

Under `environment:`, add:
```yaml
BOOK_DB_PATH: "/data/book.db"
```

Under `volumes:`, add:
```yaml
- /mnt/appdata/portal/data:/data
```

Media and lab portals remain unchanged (no `BOOK_DB_PATH`).

**Step 3: Commit**

```bash
git add Dockerfile deploy/docker-compose.portals.yml
git commit -m "feat(book): update Dockerfile and compose for Big Book deployment"
```

---

## Task 12: End-to-End Verification

**Step 1: Build the Docker image locally**

```bash
cd /home/teedge/projects/portal-template
docker build -t portal-template:latest .
```

Expected: Build succeeds without errors.

**Step 2: Test with dev server**

```bash
BOOK_DB_PATH=/tmp/test-book.db npm run dev
```

Verify:
- `/book` shows category grid with imported data
- Click a category → section list with counts
- Click a key-value section → see fields with values, edit and blur saves
- Click a table section → see rows, edit cells, add/delete rows
- `/book/admin` → add/delete categories, sections, fields
- Sidebar shows "Big Book" item

**Step 3: Final commit**

If any fixes were needed during verification, commit them. Then create a single squashed summary:

```bash
git log --oneline | head -12
```

Review all commits look correct.

---

## Deployment Checklist (post-implementation)

After all code is committed and pushed:

1. Build and push image to Gitea registry:
   ```bash
   docker build -t 192.168.150.118:3000/teedge/portal-template:latest .
   docker push 192.168.150.118:3000/teedge/portal-template:latest
   ```

2. Create data directory on Zion:
   ```bash
   ssh root@192.168.150.110 'mkdir -p /mnt/appdata/portal/data'
   ```

3. Import spreadsheet data into production DB:
   ```bash
   python scripts/import_spreadsheet.py /home/teedge/Downloads/bigbookmkIV.xlsx /tmp/book.db
   scp /tmp/book.db root@192.168.150.110:/mnt/appdata/portal/data/book.db
   ```

4. Update compose and restart home-portal:
   ```bash
   scp deploy/docker-compose.portals.yml root@192.168.150.110:/mnt/appdata/portal/build/deploy/
   ssh root@192.168.150.110 'docker stop home-portal && docker rm home-portal'
   # Recreate with new env/volumes (via dockerman or compose)
   ```

5. Verify at `https://home.teedge.local/book`
