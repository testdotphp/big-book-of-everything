<script lang="ts">
  import { fade, scale } from 'svelte/transition';

  interface Props {
    open: boolean;
    title?: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    destructive?: boolean;
    onconfirm: () => void;
    oncancel: () => void;
  }

  let {
    open = false,
    title = 'Confirm',
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    destructive = false,
    onconfirm,
    oncancel
  }: Props = $props();

  function handleKeydown(e: KeyboardEvent) {
    if (!open) return;
    if (e.key === 'Escape') oncancel();
    if (e.key === 'Enter') onconfirm();
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <div class="confirm-overlay" transition:fade={{ duration: 150 }} onclick={oncancel}></div>
  <div
    class="confirm-dialog"
    transition:scale={{ start: 0.95, duration: 150 }}
    role="dialog"
    aria-modal="true"
  >
    <div class="confirm-title">{title}</div>
    <div class="confirm-message">{message}</div>
    <div class="confirm-actions">
      <button class="confirm-cancel" onclick={oncancel}>{cancelLabel}</button>
      <button class="confirm-btn" class:destructive onclick={onconfirm}>{confirmLabel}</button>
    </div>
  </div>
{/if}

<style>
  .confirm-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    z-index: 9990;
  }

  .confirm-dialog {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: var(--bg-elevated);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    padding: 24px;
    box-shadow: var(--shadow-lg);
    z-index: 9991;
    min-width: 320px;
    max-width: 420px;
  }

  .confirm-title {
    font-family: var(--font-display);
    font-size: 16px;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 8px;
  }

  .confirm-message {
    font-size: 13px;
    color: var(--text-secondary);
    line-height: 1.5;
    margin-bottom: 20px;
  }

  .confirm-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }

  .confirm-cancel {
    background: none;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    color: var(--text-muted);
    padding: 8px 16px;
    font-family: var(--font-body);
    font-size: 13px;
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
  }

  .confirm-cancel:hover {
    color: var(--text-primary);
    border-color: var(--text-muted);
  }

  .confirm-btn {
    background: var(--theme-color);
    color: white;
    border: none;
    border-radius: var(--radius-sm);
    padding: 8px 16px;
    font-family: var(--font-body);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.15s;
  }

  .confirm-btn:hover {
    opacity: 0.9;
  }

  .confirm-btn.destructive {
    background: #ef4444;
  }

  @media (max-width: 480px) {
    .confirm-dialog {
      min-width: 0;
      left: 16px;
      right: 16px;
      transform: translateY(-50%);
    }
  }
</style>
