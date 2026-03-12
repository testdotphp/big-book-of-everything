# Group-by-Person Design for Big Book Table Sections

## Problem

Many Big Book table sections track records for multiple family members via a "who" field. Currently all records render in a flat card list, making it hard to see which records belong to which person.

## Solution

Group records by the "who" field value and render them under collapsible person-name headers. Per-group "Add entry" buttons auto-fill the "who" field.

## Scope

Applies to **9 table sections** with a "who" slug field:

| Category | Section |
|---|---|
| About Me and My Family | Previous Addresses |
| About Me and My Family | Schooling History |
| About Me and My Family | Groups and Organizations |
| Insurance | Life Insurance |
| Medical | Medical History |
| Medical | Medication |
| Medical | Extended Family Medical History |
| Medical | Long Term Health Care |
| Medical | Organ & Body Donation |

**Excluded:** All key_value sections, all Final Arrangements category sections (Final Arrangements, Funeral Guest List, Eulogy Notes).

## Data Flow

No schema changes. Grouping is a rendering concern only.

1. **Server** (`+page.server.ts`): Existing load stays the same. Additionally detect if the section has a field with slug "who" and return `whoFieldId: number | null`.
2. **Page** (`+page.svelte`): When `whoFieldId` is present, group records by `record.values[whoFieldId]`. Pass each group to a `PersonGroup` component.
3. **PersonGroup**: Renders a collapsible section per person with their RecordCards and a per-group add button.

## Component Structure

```
Section page (grouped mode)
+-- PersonGroup (name="TJ")
|   +-- RecordCard (record 1)
|   +-- RecordCard (record 2)
|   +-- [+ Add entry for TJ]
+-- PersonGroup (name="Sarah")
|   +-- RecordCard (record 1)
|   +-- [+ Add entry for Sarah]
+-- PersonGroup (name="Unassigned")
|   +-- RecordCard (empty who)
|   +-- [+ Add entry]
+-- [+ Add entry]  (global, goes to Unassigned)
```

Sections without a "who" field render the flat card list as they do now.

## PersonGroup Component

- **Header**: Person name (bold), record count badge, collapse/expand chevron
- **Expanded** (default for first group): Shows RecordCards + per-group add button
- **Collapsed**: Header only
- **"Who" field**: Still visible and editable inside cards (allows reassigning a record to a different person)
- **Group ordering**: Alphabetical by person name, "Unassigned" always last

## Add Record with Auto-fill

The `addRecord` action receives an optional `whoValue` and `whoFieldId` parameter. When "Add entry for TJ" is clicked, it creates the record AND inserts a value row for the "who" field pre-filled with "TJ". The global add button creates a record with no pre-fill.

## Sections Without "who" Field

No change. Flat card list as before.

## Files to Modify

- `src/routes/book/[category]/[section]/+page.server.ts` — detect whoFieldId, update addRecord action
- `src/routes/book/[category]/[section]/+page.svelte` — grouping logic, render PersonGroup or flat cards

## Files to Create

- `src/lib/components/PersonGroup.svelte` — collapsible person group with cards and add button
