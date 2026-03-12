<script lang="ts">
  import { Info } from 'lucide-svelte';

  interface Props {
    description: string;
  }

  let { description }: Props = $props();
</script>

<div class="placeholder-card">
  <div class="placeholder-icon">
    <Info size={20} strokeWidth={1.75} />
  </div>
  <p class="placeholder-text">{description}</p>
</div>

<style>
  .placeholder-card {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    padding: 20px;
    background: color-mix(in srgb, var(--theme-color) 5%, var(--bg-secondary));
    border: 1px solid color-mix(in srgb, var(--theme-color) 15%, var(--border-color));
    border-radius: var(--radius-lg);
  }

  .placeholder-icon {
    color: var(--theme-color);
    flex-shrink: 0;
    margin-top: 1px;
  }

  .placeholder-text {
    font-size: 14px;
    line-height: 1.6;
    color: var(--text-secondary);
  }
</style>
