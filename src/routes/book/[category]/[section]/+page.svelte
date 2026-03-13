<script lang="ts">
  import { enhance } from '$app/forms';
  import Icon from '$lib/components/Icon.svelte';
  import KeyValueEditor from '$lib/components/KeyValueEditor.svelte';
  import PersonGroup from '$lib/components/PersonGroup.svelte';
  import PlaceholderSection from '$lib/components/PlaceholderSection.svelte';
  import RecordCard from '$lib/components/RecordCard.svelte';
  import { ChevronRight, Plus, Settings, Trash2, X } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  let showFieldManager = $state(false);
  let showAddField = $state(false);

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
    const sorted: { name: string; records: { id: number; values: globalThis.Record<number, string> }[] }[] = [];
    const keys = [...grouped.keys()].filter((k) => k !== 'Unassigned').sort();
    for (const key of keys) {
      sorted.push({ name: key, records: grouped.get(key)! });
    }
    if (grouped.has('Unassigned')) {
      sorted.push({ name: 'Unassigned', records: grouped.get('Unassigned')! });
    }

    return sorted;
  });
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
  <span class="type-badge">{data.section.type === 'table' ? 'Table' : data.section.type === 'placeholder' ? 'Info' : 'Key-Value'}</span>
  {#if data.section.type !== 'placeholder'}
    <button
      class="settings-btn"
      class:active={showFieldManager}
      title="Manage fields"
      onclick={() => showFieldManager = !showFieldManager}
    >
      {#if showFieldManager}
        <X size={16} strokeWidth={2} />
      {:else}
        <Settings size={16} strokeWidth={2} />
      {/if}
    </button>
  {/if}
</div>

{#if showFieldManager}
  <div class="field-manager">
    <h3>Fields</h3>
    <div class="field-list">
      {#each data.fields as field}
        <div class="field-item">
          <span class="field-name">{field.name}</span>
          <span class="field-type-badge">{'fieldType' in field ? field.fieldType : 'text'}</span>
          <form method="POST" action="?/deleteField" use:enhance class="inline-form">
            <input type="hidden" name="fieldId" value={field.id} />
            <button type="submit" class="field-delete-btn" title="Delete field">
              <Trash2 size={12} strokeWidth={1.75} />
            </button>
          </form>
        </div>
      {/each}
    </div>
    {#if showAddField}
      <form
        method="POST"
        action="?/addField"
        class="add-field-form"
        use:enhance={() => {
          return async ({ update }) => {
            await update();
            showAddField = false;
          };
        }}
      >
        <input type="hidden" name="sectionId" value={data.section.id} />
        <input type="text" name="name" class="add-input" placeholder="Field name..." autofocus required />
        <select name="fieldType" class="add-select">
          <option value="text">Text</option>
          <option value="number">Number</option>
          <option value="date">Date</option>
          <option value="phone">Phone</option>
          <option value="email">Email</option>
          <option value="currency">Currency</option>
          <option value="url">URL</option>
          <option value="textarea">Textarea</option>
          <option value="boolean">Yes/No</option>
        </select>
        <button type="submit" class="add-submit">Add</button>
        <button type="button" class="add-cancel" onclick={() => showAddField = false}>Cancel</button>
      </form>
    {:else}
      <button class="add-field-btn" onclick={() => showAddField = true}>
        <Plus size={12} strokeWidth={2} />
        Add field
      </button>
    {/if}
  </div>
{/if}

{#if data.section.type === 'placeholder'}
  <PlaceholderSection description={data.section.description || ''} sectionId={data.section.id} files={data.files || []} />
{:else if data.section.type === 'key_value' && data.fields}
  <KeyValueEditor fields={data.fields as any} />
{:else if data.section.type === 'table' && data.records !== null}
  {#if data.fields.length === 0}
    <div class="empty-state">
      <p class="empty-title">No fields defined</p>
      <p class="empty-desc">Open field settings to add fields to this section.</p>
    </div>
  {:else if data.records.length === 0}
    <div class="empty-state">
      <p class="empty-title">No records yet</p>
      <p class="empty-desc">Add your first entry to get started.</p>
    </div>
    <form method="POST" action="?/addRecord" use:enhance>
      <input type="hidden" name="sectionId" value={data.section.id} />
      <button type="submit" class="add-row-btn">
        <Plus size={14} strokeWidth={2} />
        Add entry
      </button>
    </form>
  {:else if personGroups}
    <div class="group-list">
      {#each personGroups as group, i}
        <PersonGroup
          name={group.name}
          records={group.records}
          fields={data.fields}
          sectionId={data.section.id}
          whoFieldId={data.whoFieldId!}
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

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 40px 24px;
    text-align: center;
  }

  .empty-title {
    font-family: var(--font-display);
    font-size: 15px;
    font-weight: 600;
    color: var(--text-secondary);
    margin-bottom: 4px;
  }

  .empty-desc {
    font-size: 13px;
    color: var(--text-muted);
    margin-bottom: 16px;
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

  .card-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 12px;
  }

  .group-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 12px;
  }

  .settings-btn {
    background: none;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    color: var(--text-muted);
    cursor: pointer;
    padding: 5px;
    display: inline-flex;
    transition: color 0.15s, border-color 0.15s;
    margin-left: auto;
  }

  .settings-btn:hover,
  .settings-btn.active {
    color: var(--theme-color);
    border-color: var(--theme-color);
  }

  .field-manager {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    padding: 16px;
    margin-bottom: 20px;
  }

  .field-manager h3 {
    font-family: var(--font-display);
    font-size: 13px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text-muted);
    margin-bottom: 10px;
  }

  .field-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 10px;
  }

  .field-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    background: var(--bg-primary);
    border-radius: var(--radius-sm);
  }

  .field-name {
    flex: 1;
    font-size: 13px;
    color: var(--text-primary);
  }

  .field-type-badge {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text-muted);
    background: var(--bg-secondary);
    padding: 2px 6px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-color);
  }

  .inline-form {
    display: inline-flex;
  }

  .field-delete-btn {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 4px;
    border-radius: var(--radius-sm);
    display: inline-flex;
    transition: color 0.15s, background 0.15s;
  }

  .field-delete-btn:hover {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
  }

  .add-field-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 6px 12px;
    background: none;
    border: 1px dashed var(--border-color);
    border-radius: var(--radius-sm);
    color: var(--text-secondary);
    font-family: var(--font-body);
    font-size: 12px;
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s;
  }

  .add-field-btn:hover {
    border-color: var(--theme-color);
    color: var(--theme-color);
  }

  .add-field-form {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .add-input {
    flex: 1;
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-family: var(--font-body);
    font-size: 13px;
    padding: 6px 10px;
  }

  .add-input:focus {
    outline: none;
    border-color: var(--theme-color);
  }

  .add-select {
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-family: var(--font-body);
    font-size: 13px;
    padding: 6px 10px;
  }

  .add-submit {
    background: var(--theme-color);
    color: white;
    border: none;
    border-radius: var(--radius-sm);
    padding: 6px 14px;
    font-family: var(--font-body);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
  }

  .add-cancel {
    background: none;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    color: var(--text-muted);
    padding: 6px 10px;
    font-family: var(--font-body);
    font-size: 13px;
    cursor: pointer;
  }
</style>
