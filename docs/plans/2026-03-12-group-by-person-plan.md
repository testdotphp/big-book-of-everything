# Group-by-Person Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Group records by the "who" field in table sections so each person's entries appear under a collapsible person-name header with per-group "Add entry" buttons.

**Architecture:** Server detects if a table section has a "who" field (excluding Final Arrangements category) and returns `whoFieldId`. The page groups records by that field's value and passes each group to a new `PersonGroup` component. No schema changes.

**Tech Stack:** SvelteKit, Svelte 5 runes ($state/$derived/$props), Drizzle ORM, SQLite

---

### Task 1: Update Server to Return whoFieldId

**Files:**
- Modify: `src/routes/book/[category]/[section]/+page.server.ts:47-68`

**Step 1: Add whoFieldId detection in the table branch of the load function**

After `fieldList` is fetched (line 35), before the table record loading, detect the "who" field. Exclude category slug `"final-arrangements"`.

Replace lines 47-68 (the `else` branch for table sections):

```ts
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
```

**Step 2: Update addRecord action to support auto-filling "who" value**

Replace the `addRecord` action (lines 116-132):

```ts
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
```

**Step 3: Verify build**

Run: `cd /home/teedge/projects/portal-template && npx svelte-kit sync && npx svelte-check`
Expected: No errors (there may be warnings)

**Step 4: Commit**

```bash
git add src/routes/book/[category]/[section]/+page.server.ts
git commit -m "feat(book): detect whoFieldId and support auto-fill on addRecord"
```

---

### Task 2: Create PersonGroup Component

**Files:**
- Create: `src/lib/components/PersonGroup.svelte`

**Step 1: Create the PersonGroup component**

This component wraps a group of RecordCards under a collapsible person-name header with a per-group "Add entry" button.

```svelte
<script lang="ts">
  import { enhance } from '$app/forms';
  import RecordCard from './RecordCard.svelte';
  import { ChevronDown, Plus } from 'lucide-svelte';

  interface Field {
    id: number;
    name: string;
    slug: string;
    fieldType: string;
    sortOrder: number;
  }

  interface Record {
    id: number;
    values: globalThis.Record<number, string>;
  }

  interface Props {
    name: string;
    records: Record[];
    fields: Field[];
    sectionId: number;
    whoFieldId: number;
    expanded?: boolean;
  }

  let { name, records, fields, sectionId, whoFieldId, expanded: initialExpanded = false }: Props = $props();
  let expanded = $state(initialExpanded);
</script>

<div class="person-group" class:expanded>
  <button class="group-header" onclick={() => expanded = !expanded}>
    <span class="chevron" class:rotated={expanded}>
      <ChevronDown size={16} strokeWidth={2} />
    </span>
    <span class="group-name">{name}</span>
    <span class="group-count">{records.length}</span>
  </button>

  {#if expanded}
    <div class="group-body">
      <div class="card-list">
        {#each records as record, i}
          <RecordCard {record} {fields} index={i} />
        {/each}
      </div>
      <form method="POST" action="?/addRecord" use:enhance>
        <input type="hidden" name="sectionId" value={sectionId} />
        <input type="hidden" name="whoFieldId" value={whoFieldId} />
        <input type="hidden" name="whoValue" value={name === 'Unassigned' ? '' : name} />
        <button type="submit" class="add-row-btn">
          <Plus size={14} strokeWidth={2} />
          {name === 'Unassigned' ? 'Add entry' : `Add entry for ${name}`}
        </button>
      </form>
    </div>
  {/if}
</div>

<style>
  .person-group {
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    overflow: hidden;
  }

  .person-group.expanded {
    border-color: color-mix(in srgb, var(--theme-color) 15%, var(--border-color));
  }

  .group-header {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    background: var(--bg-secondary);
    border: none;
    cursor: pointer;
    text-align: left;
    color: var(--text-primary);
  }

  .chevron {
    display: flex;
    color: var(--text-muted);
    transition: transform 0.15s;
  }

  .chevron.rotated {
    transform: rotate(180deg);
  }

  .group-name {
    font-family: var(--font-display);
    font-size: 15px;
    font-weight: 700;
    letter-spacing: -0.01em;
  }

  .group-count {
    font-size: 11px;
    color: var(--text-muted);
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 10px;
    padding: 1px 7px;
    font-weight: 600;
  }

  .group-body {
    padding: 12px 16px 16px;
  }

  .card-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 12px;
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

**Step 2: Verify build**

Run: `cd /home/teedge/projects/portal-template && npx svelte-kit sync && npx svelte-check`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/components/PersonGroup.svelte
git commit -m "feat(book): add PersonGroup component for grouped record display"
```

---

### Task 3: Update Section Page to Use Grouped Rendering

**Files:**
- Modify: `src/routes/book/[category]/[section]/+page.svelte`

**Step 1: Add PersonGroup import and grouping logic**

In the `<script>` block, add the import and a derived grouping computation:

```ts
  import PersonGroup from '$lib/components/PersonGroup.svelte';
```

Add after the `data` prop declaration:

```ts
  interface PersonGroupData {
    name: string;
    records: { id: number; values: globalThis.Record<number, string> }[];
  }

  let personGroups = $derived.by(() => {
    if (!data.whoFieldId || !data.records) return null;

    const grouped = new Map<string, { id: number; values: globalThis.Record<number, string> }[]>();

    for (const record of data.records) {
      const who = record.values[data.whoFieldId] || '';
      const key = who || 'Unassigned';
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(record);
    }

    // Sort alphabetically, "Unassigned" last
    const sorted: PersonGroupData[] = [];
    const keys = [...grouped.keys()].filter((k) => k !== 'Unassigned').sort();
    for (const key of keys) {
      sorted.push({ name: key, records: grouped.get(key)! });
    }
    if (grouped.has('Unassigned')) {
      sorted.push({ name: 'Unassigned', records: grouped.get('Unassigned')! });
    }

    return sorted;
  });
```

**Step 2: Update the table rendering branch**

Replace the table branch (lines 34-50) with:

```svelte
{:else if data.section.type === 'table' && data.records !== null}
  {#if data.fields.length === 0}
    <p class="empty">No fields defined for this section.</p>
  {:else if personGroups}
    <div class="group-list">
      {#each personGroups as group, i}
        <PersonGroup
          name={group.name}
          records={group.records}
          fields={data.fields}
          sectionId={data.section.id}
          whoFieldId={data.whoFieldId}
          expanded={i === 0}
        />
      {/each}
    </div>
    <form method="POST" action="?/addRecord" use:enhance>
      <input type="hidden" name="sectionId" value={data.section.id} />
      <button type="submit" class="add-row-btn">
        <Plus size={14} strokeWidth={2} />
        Add entry
      </button>
    </form>
  {:else}
    <div class="card-list">
      {#each data.records as record, i}
        <RecordCard {record} fields={data.fields} index={i} />
      {/each}
    </div>
    <form method="POST" action="?/addRecord" use:enhance>
      <input type="hidden" name="sectionId" value={data.section.id} />
      <button type="submit" class="add-row-btn">
        <Plus size={14} strokeWidth={2} />
        Add entry
      </button>
    </form>
  {/if}
{/if}
```

**Step 3: Add group-list style**

In the `<style>` block, add:

```css
  .group-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 12px;
  }
```

**Step 4: Verify build**

Run: `cd /home/teedge/projects/portal-template && npx svelte-kit sync && npx svelte-check`
Expected: No errors

**Step 5: Commit**

```bash
git add src/routes/book/[category]/[section]/+page.svelte
git commit -m "feat(book): render grouped records by person in table sections"
```

---

### Task 4: Build, Deploy, Verify

**Step 1: Push to Gitea**

```bash
GITEA_TOKEN=$(pass show homelab/gitea/admin | grep 'api-token:' | awk '{print $2}')
git push http://teedge:${GITEA_TOKEN}@192.168.150.118:3000/teedge/portal-template.git master
```

**Step 2: Clone and build on Zion**

```bash
ssh root@192.168.150.110 "rm -rf /tmp/portal-build && git clone http://teedge:<TOKEN>@192.168.150.118:3000/teedge/portal-template.git /tmp/portal-build"
ssh root@192.168.150.110 "cd /tmp/portal-build && DOCKER_BUILDKIT=0 docker build -t 192.168.150.118:3000/teedge/portal-template:latest ."
```

**Step 3: Clear DB and redeploy**

```bash
ssh root@192.168.150.110 "docker stop home-portal && docker rm home-portal && rm -f /mnt/appdata/portal/data/book.db"
# Then recreate container with same docker run command (see previous deploy)
ssh root@192.168.150.110 "rm -rf /tmp/portal-build"
```

**Step 4: Verify**

1. Navigate to a grouped section (e.g., Medical > Medication)
2. Confirm the initial empty record shows under "Unassigned" group
3. Fill in the "Who" field with a name, blur to save, reload — record should move to that person's group
4. Click "Add entry for [Name]" — new record should appear in that group with "Who" pre-filled
5. Navigate to a non-grouped section (e.g., Final Arrangements > Funeral Guest List) — should render flat cards as before
6. Navigate to a non-"who" section (e.g., Assets > Bank Accounts) — flat cards as before
