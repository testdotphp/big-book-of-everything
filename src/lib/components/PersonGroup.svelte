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
  let cardFields = $derived(fields.filter((f) => f.id !== whoFieldId));
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
          <RecordCard {record} fields={cardFields} index={i} />
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
