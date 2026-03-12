<script lang="ts">
  import { enhance } from '$app/forms';
  import RecordCard from './RecordCard.svelte';
  import { ChevronDown, Pencil, Plus } from 'lucide-svelte';

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
  let isUnassigned = $derived(name === 'Unassigned');
  let cardFields = $derived(isUnassigned ? fields : fields.filter((f) => f.id !== whoFieldId));

  let editing = $state(false);
  let editValue = $state('');

  function startEditing() {
    editValue = isUnassigned ? '' : name;
    editing = true;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      (e.currentTarget as HTMLInputElement).form?.requestSubmit();
      editing = false;
    } else if (e.key === 'Escape') {
      editing = false;
    }
  }
</script>

<div class="person-group" class:expanded>
  <div class="group-header">
    <button class="toggle-btn" onclick={() => expanded = !expanded}>
      <span class="chevron" class:rotated={expanded}>
        <ChevronDown size={16} strokeWidth={2} />
      </span>
    </button>
    {#if editing}
      <form
        method="POST"
        action="?/renameGroup"
        class="rename-form"
        use:enhance={() => {
          return async ({ update }) => {
            await update({ reset: false });
          };
        }}
      >
        <input type="hidden" name="whoFieldId" value={whoFieldId} />
        <input type="hidden" name="recordIds" value={records.map((r) => r.id).join(',')} />
        <input
          type="text"
          name="newName"
          class="rename-input"
          placeholder="Enter person name..."
          value={editValue}
          onblur={(e) => { e.currentTarget.form?.requestSubmit(); editing = false; }}
          onkeydown={handleKeydown}
          autofocus
        />
      </form>
    {:else}
      <span
        class="group-name"
        class:placeholder={isUnassigned}
        onclick={() => expanded = !expanded}
      >
        {isUnassigned ? 'No name set' : name}
      </span>
      <button class="edit-btn" title="Edit group name" onclick={(e) => { e.stopPropagation(); startEditing(); }}>
        <Pencil size={12} strokeWidth={2} />
      </button>
    {/if}
    <span class="group-count">{records.length}</span>
  </div>

  {#if expanded}
    <div class="group-body">
      <div class="card-list">
        {#each records as record, i}
          <RecordCard {record} fields={cardFields} index={i} />
        {/each}
      </div>
      <form method="POST" action="?/addRecord" use:enhance>
        <input type="hidden" name="sectionId" value={sectionId} />
        <input type="hidden" name="whoFieldId" value={whoFieldId} />
        <input type="hidden" name="whoValue" value={isUnassigned ? '' : name} />
        <button type="submit" class="add-row-btn">
          <Plus size={14} strokeWidth={2} />
          {isUnassigned ? 'Add entry' : `Add entry for ${name}`}
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
  }

  .toggle-btn {
    display: flex;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
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
    flex: 1;
    cursor: pointer;
    font-family: var(--font-display);
    font-size: 15px;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: var(--text-primary);
  }

  .group-name.placeholder {
    color: var(--text-muted);
    font-weight: 400;
    font-style: italic;
  }

  .edit-btn {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 4px;
    border-radius: var(--radius-sm);
    display: inline-flex;
    transition: color 0.15s, background 0.15s;
    flex-shrink: 0;
  }

  .edit-btn:hover {
    background: color-mix(in srgb, var(--theme-color) 10%, transparent);
    color: var(--theme-color);
  }

  .rename-form {
    flex: 1;
  }

  .rename-input {
    width: 100%;
    background: var(--bg-primary);
    border: 1px solid var(--theme-color);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-family: var(--font-display);
    font-size: 15px;
    font-weight: 700;
    letter-spacing: -0.01em;
    padding: 2px 8px;
    outline: none;
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
