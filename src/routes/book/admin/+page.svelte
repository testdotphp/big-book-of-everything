<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import { ChevronRight } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>Structure | Big Book</title>
</svelte:head>

<nav class="breadcrumb">
  <a href="/book">Big Book</a>
  <ChevronRight size={14} strokeWidth={2} />
  <span>Structure</span>
</nav>

<h1>Structure Overview</h1>
<p class="subtitle">{data.categories.length} categories</p>

{#each data.categories as cat}
  <div class="category-block">
    <div class="category-header">
      <div class="category-icon">
        <Icon name={cat.icon || 'folder'} size={18} />
      </div>
      <h2>{cat.name}</h2>
      <span class="count">{cat.sections.length} sections</span>
    </div>

    {#each cat.sections as section}
      <div class="section-block">
        <div class="section-header">
          <span class="section-name">{section.name}</span>
          <span class="section-type">{section.type === 'table' ? 'Table' : section.type === 'placeholder' ? 'Info' : 'Key-Value'}</span>
          {#if section.fields.length > 0}
            <span class="count">{section.fields.length} fields</span>
          {/if}
        </div>

        {#if section.fields.length > 0}
          <div class="field-list">
            {#each section.fields as field}
              <div class="field-row">
                <span class="field-name">{field.name}</span>
                <span class="field-type">{field.fieldType}</span>
              </div>
            {/each}
          </div>
        {:else if section.type === 'placeholder' && section.description}
          <p class="section-desc">{section.description}</p>
        {/if}
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
    margin-bottom: 4px;
  }

  .subtitle {
    font-size: 13px;
    color: var(--text-muted);
    margin-bottom: 24px;
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
    gap: 10px;
    margin-bottom: 16px;
  }

  .category-icon {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-sm);
    background: color-mix(in srgb, var(--theme-color) 10%, var(--bg-elevated));
    color: var(--theme-color);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  h2 {
    font-family: var(--font-display);
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
    flex: 1;
  }

  .count {
    font-size: 12px;
    color: var(--text-muted);
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

  .section-desc {
    font-size: 13px;
    color: var(--text-muted);
    margin-top: 8px;
    font-style: italic;
  }

  .field-list {
    margin-top: 10px;
    display: flex;
    flex-wrap: wrap;
    gap: 4px 12px;
  }

  .field-row {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 3px 8px;
    border-radius: var(--radius-sm);
    font-size: 12px;
  }

  .field-name {
    color: var(--text-secondary);
  }

  .field-type {
    font-size: 10px;
    color: var(--text-muted);
    background: var(--bg-secondary);
    padding: 1px 5px;
    border-radius: var(--radius-sm);
  }
</style>
