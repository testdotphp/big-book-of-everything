<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import { Settings } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>Big Book | {data.config?.name || 'Portal'}</title>
</svelte:head>

<div class="header">
  <h1>Big Book of Everything</h1>
  <p class="subtitle">{data.categories.length} categories</p>
  <a href="/book/admin" class="admin-link" title="View structure">
    <Settings size={18} strokeWidth={1.75} />
  </a>
</div>

<div class="grid">
  {#each data.categories as cat}
    <a href="/book/{cat.slug}" class="card">
      <div class="card-icon">
        <Icon name={cat.icon || 'folder'} size={24} />
      </div>
      <div class="card-body">
        <h2>{cat.name}</h2>
        <span class="card-count">{cat.sectionCount} {cat.sectionCount === 1 ? 'section' : 'sections'}</span>
      </div>
    </a>
  {/each}
</div>

<style>
  .header {
    margin-bottom: 32px;
    display: flex;
    align-items: baseline;
    gap: 12px;
    flex-wrap: wrap;
  }

  h1 {
    font-family: var(--font-display);
    font-size: 24px;
    font-weight: 700;
    letter-spacing: -0.03em;
    color: var(--text-primary);
  }

  .subtitle {
    font-size: 14px;
    color: var(--text-muted);
  }

  .admin-link {
    margin-left: auto;
    color: var(--text-muted);
    padding: 6px;
    border-radius: var(--radius-sm);
    display: flex;
    transition: color 0.15s, background 0.15s;
  }

  .admin-link:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 16px;
  }

  .card {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 20px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    transition: background 0.15s, border-color 0.15s;
    cursor: pointer;
  }

  .card:hover {
    background: var(--bg-elevated);
    border-color: color-mix(in srgb, var(--theme-color) 20%, transparent);
  }

  .card-icon {
    width: 48px;
    height: 48px;
    border-radius: var(--radius-md);
    background: color-mix(in srgb, var(--theme-color) 10%, var(--bg-elevated));
    color: var(--theme-color);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .card-body {
    min-width: 0;
  }

  h2 {
    font-family: var(--font-display);
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary);
    letter-spacing: -0.01em;
  }

  .card-count {
    font-size: 13px;
    color: var(--text-muted);
  }
</style>
