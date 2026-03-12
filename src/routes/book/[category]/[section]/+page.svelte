<script lang="ts">
  import { enhance } from '$app/forms';
  import Icon from '$lib/components/Icon.svelte';
  import KeyValueEditor from '$lib/components/KeyValueEditor.svelte';
  import PlaceholderSection from '$lib/components/PlaceholderSection.svelte';
  import RecordCard from '$lib/components/RecordCard.svelte';
  import { ChevronRight, Plus } from 'lucide-svelte';
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
  <span class="type-badge">{data.section.type === 'table' ? 'Table' : data.section.type === 'placeholder' ? 'Info' : 'Key-Value'}</span>
</div>

{#if data.section.type === 'placeholder'}
  <PlaceholderSection description={data.section.description || ''} />
{:else if data.section.type === 'key_value' && data.fields}
  <KeyValueEditor fields={data.fields as any} />
{:else if data.section.type === 'table' && data.records !== null}
  {#if data.fields.length === 0}
    <p class="empty">No fields defined for this section.</p>
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

  .empty {
    color: var(--text-muted);
    font-size: 14px;
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
</style>
