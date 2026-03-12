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
