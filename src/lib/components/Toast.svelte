<script lang="ts">
  import { toast } from '$lib/stores/toast';
  import { fly, fade } from 'svelte/transition';
  import { Check, X, Info } from 'lucide-svelte';

  let toasts = $state<{ id: number; message: string; type: string }[]>([]);

  toast.subscribe((v) => { toasts = v; });
</script>

{#if toasts.length > 0}
  <div class="toast-container">
    {#each toasts as t (t.id)}
      <div
        class="toast toast-{t.type}"
        in:fly={{ y: 20, duration: 200 }}
        out:fade={{ duration: 150 }}
      >
        <span class="toast-icon">
          {#if t.type === 'success'}<Check size={14} strokeWidth={2.5} />
          {:else if t.type === 'error'}<X size={14} strokeWidth={2.5} />
          {:else}<Info size={14} strokeWidth={2.5} />
          {/if}
        </span>
        <span class="toast-msg">{t.message}</span>
        <button class="toast-close" onclick={() => toast.dismiss(t.id)}>
          <X size={12} strokeWidth={2} />
        </button>
      </div>
    {/each}
  </div>
{/if}

<style>
  .toast-container {
    position: fixed;
    bottom: 20px;
    right: 20px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    z-index: 9999;
    pointer-events: none;
  }

  .toast {
    pointer-events: auto;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    border-radius: var(--radius-md);
    background: var(--bg-elevated);
    border: 1px solid var(--border-color);
    box-shadow: var(--shadow-lg);
    font-family: var(--font-body);
    font-size: 13px;
    color: var(--text-primary);
    max-width: 360px;
  }

  .toast-icon {
    display: flex;
    flex-shrink: 0;
  }

  .toast-success .toast-icon { color: #22c55e; }
  .toast-error .toast-icon { color: #ef4444; }
  .toast-info .toast-icon { color: var(--theme-color); }

  .toast-msg {
    flex: 1;
    min-width: 0;
  }

  .toast-close {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 2px;
    display: flex;
    border-radius: var(--radius-sm);
    transition: color 0.15s;
    flex-shrink: 0;
  }

  .toast-close:hover {
    color: var(--text-primary);
  }

  @media (max-width: 768px) {
    .toast-container {
      left: 16px;
      right: 16px;
      bottom: 16px;
    }
    .toast {
      max-width: none;
    }
  }
</style>
