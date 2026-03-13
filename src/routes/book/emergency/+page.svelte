<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import { ChevronRight, Plus, Trash2, Copy, Check } from 'lucide-svelte';
  import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
  import { toast } from '$lib/stores/toast';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let showCreate = $state(false);
  let newName = $state('');
  let expiresInDays = $state('');
  let copied = $state<number | null>(null);
  let confirmRevokeId = $state<number | null>(null);

  async function createToken() {
    const name = newName.trim();
    if (!name) return;
    await fetch('/api/book/emergency', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, expiresInDays: expiresInDays ? Number(expiresInDays) : null })
    });
    newName = '';
    expiresInDays = '';
    showCreate = false;
    toast.success('Access link created');
    await invalidateAll();
  }

  async function revokeToken(id: number) {
    await fetch(`/api/book/emergency?id=${id}`, { method: 'DELETE' });
    toast.success('Access link revoked');
    await invalidateAll();
  }

  function copyLink(token: string, id: number) {
    const url = `${window.location.origin}/book/emergency/${token}`;
    navigator.clipboard.writeText(url);
    copied = id;
    toast.success('Link copied to clipboard');
    setTimeout(() => { copied = null; }, 2000);
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }
</script>

<svelte:head>
  <title>Emergency Access | Big Book</title>
</svelte:head>

<nav class="breadcrumb">
  <a href="/book">Big Book</a>
  <ChevronRight size={14} strokeWidth={2} />
  <span>Emergency Access</span>
</nav>

<div class="header">
  <h1>Emergency Access</h1>
</div>

<p class="description">
  Create shareable read-only links for trusted family members or emergency contacts.
  Sensitive fields (SSN, passwords, etc.) are hidden in emergency view.
</p>

{#if data.tokens.length > 0}
  <div class="token-list">
    {#each data.tokens as token}
      <div class="token-item" class:expired={token.expired}>
        <div class="token-info">
          <span class="token-name">{token.name}</span>
          <span class="token-meta">
            Created {formatDate(token.createdAt)}
            {#if token.expiresAt}
              {#if token.expired}
                — Expired {formatDate(token.expiresAt)}
              {:else}
                — Expires {formatDate(token.expiresAt)}
              {/if}
            {:else}
              — Never expires
            {/if}
          </span>
        </div>
        <button class="token-action" title="Copy link" onclick={() => copyLink(token.token, token.id)}>
          {#if copied === token.id}
            <Check size={14} strokeWidth={2} />
          {:else}
            <Copy size={14} strokeWidth={1.75} />
          {/if}
        </button>
        <button class="token-action delete" title="Revoke" onclick={() => confirmRevokeId = token.id}>
          <Trash2 size={14} strokeWidth={1.75} />
        </button>
      </div>
    {/each}
  </div>
{/if}

{#if showCreate}
  <div class="create-form">
    <input
      type="text"
      class="create-input"
      placeholder="Label (e.g. Mom, Lawyer, Spouse)"
      bind:value={newName}
      onkeydown={(e) => { if (e.key === 'Enter') createToken(); }}
      autofocus
    />
    <select class="create-select" bind:value={expiresInDays}>
      <option value="">Never expires</option>
      <option value="7">7 days</option>
      <option value="30">30 days</option>
      <option value="90">90 days</option>
      <option value="365">1 year</option>
    </select>
    <button class="create-submit" onclick={createToken}>Create Link</button>
    <button class="create-cancel" onclick={() => showCreate = false}>Cancel</button>
  </div>
{:else}
  <button class="add-btn" onclick={() => showCreate = true}>
    <Plus size={14} strokeWidth={2} />
    Create Access Link
  </button>
{/if}

<ConfirmDialog
  open={confirmRevokeId !== null}
  title="Revoke Access Link"
  message="This link will stop working immediately. Anyone using it will lose access."
  confirmLabel="Revoke"
  destructive
  onconfirm={() => { if (confirmRevokeId !== null) { revokeToken(confirmRevokeId); confirmRevokeId = null; } }}
  oncancel={() => confirmRevokeId = null}
/>

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
    margin-bottom: 12px;
  }

  h1 {
    font-family: var(--font-display);
    font-size: 20px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .description {
    font-size: 14px;
    color: var(--text-secondary);
    line-height: 1.6;
    margin-bottom: 24px;
    max-width: 600px;
  }

  .token-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 16px;
  }

  .token-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
  }

  .token-item.expired {
    opacity: 0.5;
  }

  .token-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .token-name {
    font-family: var(--font-display);
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .token-meta {
    font-size: 12px;
    color: var(--text-muted);
  }

  .token-action {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 6px;
    border-radius: var(--radius-sm);
    display: flex;
    transition: color 0.15s, background 0.15s;
  }

  .token-action:hover {
    background: var(--bg-hover);
    color: var(--theme-color);
  }

  .token-action.delete:hover {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
  }

  .create-form {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .create-input {
    flex: 1;
    min-width: 200px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-family: var(--font-body);
    font-size: 13px;
    padding: 8px 12px;
  }

  .create-input:focus {
    outline: none;
    border-color: var(--theme-color);
  }

  .create-select {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-family: var(--font-body);
    font-size: 13px;
    padding: 8px 12px;
  }

  .create-submit {
    background: var(--theme-color);
    color: white;
    border: none;
    border-radius: var(--radius-sm);
    padding: 8px 16px;
    font-family: var(--font-body);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
  }

  .create-cancel {
    background: none;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    color: var(--text-muted);
    padding: 8px 12px;
    font-family: var(--font-body);
    font-size: 13px;
    cursor: pointer;
  }

  .add-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 10px 18px;
    background: var(--bg-secondary);
    border: 1px dashed var(--border-color);
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    font-family: var(--font-body);
    font-size: 13px;
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s;
  }

  .add-btn:hover {
    border-color: var(--theme-color);
    color: var(--theme-color);
  }
</style>
