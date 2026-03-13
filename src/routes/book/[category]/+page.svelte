<script lang="ts">
  import { enhance } from '$app/forms';
  import Icon from '$lib/components/Icon.svelte';
  import { ChevronRight, Plus, Trash2, Printer } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  let showAddForm = $state(false);
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
  <a href="/book/print" class="print-link" title="Print Book">
    <Printer size={16} strokeWidth={1.75} />
  </a>
</div>

{#if data.sections.length === 0}
  <div class="empty-state">
    <div class="empty-icon">
      <Icon name={data.category.icon || 'folder'} size={32} />
    </div>
    <p class="empty-title">No sections yet</p>
    <p class="empty-desc">Add a section to start organizing this category.</p>
  </div>
{:else}
  <div class="section-list">
    {#each data.sections as section}
      <div class="section-row-wrap">
        <a href="/book/{data.category.slug}/{section.slug}" class="section-row">
          <div class="section-info">
            <span class="section-name">{section.name}</span>
            <span class="section-meta">
              {#if section.type === 'placeholder'}
                Info page
              {:else if section.type === 'table'}
                {section.itemCount} {section.itemCount === 1 ? 'record' : 'records'}
              {:else}
                {section.itemCount}/{'totalFields' in section ? section.totalFields : 0} fields
              {/if}
            </span>
          </div>
          <span class="section-type">{section.type === 'table' ? 'Table' : section.type === 'placeholder' ? 'Info' : 'Key-Value'}</span>
          <ChevronRight size={16} strokeWidth={2} />
        </a>
        {#if !section.seeded}
          <form method="POST" action="?/deleteSection" use:enhance class="delete-form">
            <input type="hidden" name="sectionId" value={section.id} />
            <button type="submit" class="delete-btn" title="Delete section">
              <Trash2 size={14} strokeWidth={1.75} />
            </button>
          </form>
        {/if}
      </div>
    {/each}
  </div>
{/if}

{#if showAddForm}
  <form
    method="POST"
    action="?/addSection"
    class="add-section-form"
    use:enhance={() => {
      return async ({ update }) => {
        await update();
        showAddForm = false;
      };
    }}
  >
    <input type="text" name="name" class="add-input" placeholder="Section name..." autofocus required />
    <select name="type" class="add-select">
      <option value="table">Table</option>
      <option value="key_value">Key-Value</option>
      <option value="placeholder">Info</option>
    </select>
    <button type="submit" class="add-submit">Add</button>
    <button type="button" class="add-cancel" onclick={() => showAddForm = false}>Cancel</button>
  </form>
{:else}
  <button class="add-section-btn" onclick={() => showAddForm = true}>
    <Plus size={14} strokeWidth={2} />
    Add section
  </button>
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

  .print-link {
    margin-left: auto;
    color: var(--text-muted);
    padding: 6px;
    border-radius: var(--radius-sm);
    display: flex;
    transition: color 0.15s, background 0.15s;
  }

  .print-link:hover {
    background: var(--bg-hover);
    color: var(--theme-color);
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 48px 24px;
    text-align: center;
  }

  .empty-icon {
    width: 64px;
    height: 64px;
    border-radius: var(--radius-lg);
    background: color-mix(in srgb, var(--theme-color) 8%, var(--bg-secondary));
    color: var(--text-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 16px;
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

  .section-row-wrap {
    display: flex;
    align-items: center;
    gap: 0;
  }

  .section-row-wrap .section-row {
    flex: 1;
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
  }

  .delete-form {
    display: flex;
  }

  .delete-btn {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-left: none;
    border-radius: 0 var(--radius-md) var(--radius-md) 0;
    color: var(--text-muted);
    cursor: pointer;
    padding: 0 12px;
    display: flex;
    align-items: center;
    transition: color 0.15s, background 0.15s;
  }

  .delete-btn:hover {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
  }

  .add-section-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    margin-top: 12px;
    background: var(--bg-secondary);
    border: 1px dashed var(--border-color);
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    font-family: var(--font-body);
    font-size: 13px;
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s;
  }

  .add-section-btn:hover {
    border-color: var(--theme-color);
    color: var(--theme-color);
  }

  .add-section-form {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 12px;
    padding: 12px 16px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
  }

  .add-input {
    flex: 1;
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-family: var(--font-body);
    font-size: 13px;
    padding: 7px 10px;
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
    padding: 7px 10px;
  }

  .add-submit {
    background: var(--theme-color);
    color: white;
    border: none;
    border-radius: var(--radius-sm);
    padding: 7px 16px;
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
    padding: 7px 12px;
    font-family: var(--font-body);
    font-size: 13px;
    cursor: pointer;
  }
</style>
