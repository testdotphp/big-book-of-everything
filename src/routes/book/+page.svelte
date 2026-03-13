<script lang="ts">
  import { enhance } from '$app/forms';
  import Icon from '$lib/components/Icon.svelte';
  import { Plus, Printer, AlertTriangle, Clock } from 'lucide-svelte';
  import type { PageData } from './$types';

  interface Reminder {
    fieldName: string;
    value: string;
    status: 'expired' | 'soon' | 'upcoming';
    daysUntil: number;
    categorySlug: string;
    sectionSlug: string;
    sectionName: string;
    context: string;
  }

  let { data }: { data: PageData } = $props();
  let showAddForm = $state(false);
  let reminders = $state<Reminder[]>([]);
  let showReminders = $state(false);

  if (typeof window !== 'undefined') {
    fetch('/api/book/reminders')
      .then(r => r.json())
      .then(d => { reminders = d.reminders || []; })
      .catch(() => {});
  }
</script>

<svelte:head>
  <title>Big Book | {data.config?.name || 'Portal'}</title>
</svelte:head>

<div class="header">
  <h1>Big Book of Everything</h1>
  <p class="subtitle">{data.categories.length} categories</p>
  <a href="/book/print" class="print-link" title="Print Book">
    <Printer size={16} strokeWidth={1.75} />
  </a>
</div>

{#if reminders.length > 0}
  <button class="reminders-banner" class:has-expired={reminders.some(r => r.status === 'expired')} onclick={() => showReminders = !showReminders}>
    {#if reminders.some(r => r.status === 'expired')}
      <AlertTriangle size={16} strokeWidth={2} />
    {:else}
      <Clock size={16} strokeWidth={2} />
    {/if}
    <span>
      {reminders.filter(r => r.status === 'expired').length} expired, {reminders.filter(r => r.status !== 'expired').length} upcoming
    </span>
  </button>

  {#if showReminders}
    <div class="reminders-list">
      {#each reminders as r}
        <a href="/book/{r.categorySlug}/{r.sectionSlug}" class="reminder-item" class:expired={r.status === 'expired'} class:soon={r.status === 'soon'}>
          <span class="reminder-context">{r.context}</span>
          <span class="reminder-field">{r.fieldName}</span>
          <span class="reminder-date">{new Date(r.value).toLocaleDateString()}</span>
          <span class="reminder-status">
            {#if r.daysUntil < 0}
              {Math.abs(r.daysUntil)}d overdue
            {:else if r.daysUntil === 0}
              Today
            {:else}
              {r.daysUntil}d left
            {/if}
          </span>
        </a>
      {/each}
    </div>
  {/if}
{/if}

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

  {#if showAddForm}
    <form
      method="POST"
      action="?/addCategory"
      class="add-card"
      use:enhance={() => {
        return async ({ update }) => {
          await update();
          showAddForm = false;
        };
      }}
    >
      <input type="text" name="name" class="add-input" placeholder="Category name..." autofocus required />
      <input type="text" name="icon" class="add-input icon-input" placeholder="Icon (e.g. folder)" value="folder" />
      <div class="add-actions">
        <button type="submit" class="add-submit">Add</button>
        <button type="button" class="add-cancel" onclick={() => showAddForm = false}>Cancel</button>
      </div>
    </form>
  {:else}
    <button class="add-card-btn" onclick={() => showAddForm = true}>
      <Plus size={20} strokeWidth={2} />
      <span>Add category</span>
    </button>
  {/if}
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

  .reminders-banner {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 12px 16px;
    background: color-mix(in srgb, var(--theme-color) 8%, var(--bg-secondary));
    border: 1px solid color-mix(in srgb, var(--theme-color) 20%, var(--border-color));
    border-radius: var(--radius-md);
    color: var(--theme-color);
    font-family: var(--font-body);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    margin-bottom: 16px;
    transition: background 0.15s;
  }

  .reminders-banner.has-expired {
    background: color-mix(in srgb, #ef4444 8%, var(--bg-secondary));
    border-color: color-mix(in srgb, #ef4444 20%, var(--border-color));
    color: #ef4444;
  }

  .reminders-banner:hover {
    background: color-mix(in srgb, var(--theme-color) 12%, var(--bg-secondary));
  }

  .reminders-banner.has-expired:hover {
    background: color-mix(in srgb, #ef4444 12%, var(--bg-secondary));
  }

  .reminders-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 20px;
  }

  .reminder-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    font-size: 13px;
    transition: background 0.1s;
  }

  .reminder-item:hover {
    background: var(--bg-elevated);
  }

  .reminder-item.expired {
    border-left: 3px solid #ef4444;
  }

  .reminder-item.soon {
    border-left: 3px solid #f59e0b;
  }

  .reminder-context {
    font-weight: 600;
    color: var(--text-primary);
    min-width: 120px;
  }

  .reminder-field {
    color: var(--text-secondary);
    flex: 1;
  }

  .reminder-date {
    color: var(--text-muted);
    font-size: 12px;
  }

  .reminder-status {
    font-size: 11px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 8px;
    white-space: nowrap;
  }

  .reminder-item.expired .reminder-status {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
  }

  .reminder-item.soon .reminder-status {
    background: rgba(245, 158, 11, 0.1);
    color: #f59e0b;
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

  .add-card-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 20px;
    background: none;
    border: 2px dashed var(--border-color);
    border-radius: var(--radius-lg);
    color: var(--text-muted);
    font-family: var(--font-body);
    font-size: 13px;
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s;
    min-height: 88px;
  }

  .add-card-btn:hover {
    border-color: var(--theme-color);
    color: var(--theme-color);
  }

  .add-card {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 20px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
  }

  .add-input {
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

  .icon-input {
    font-size: 12px;
  }

  .add-actions {
    display: flex;
    gap: 8px;
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
