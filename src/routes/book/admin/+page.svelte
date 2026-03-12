<script lang="ts">
  import { enhance } from '$app/forms';
  import { ChevronRight, Plus, Trash2 } from 'lucide-svelte';
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
