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
