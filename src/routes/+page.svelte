<script lang="ts">
  import type { PageData } from './$types';
  import IframePanel from '$lib/components/IframePanel.svelte';
  import Icon from '$lib/components/Icon.svelte';

  let { data }: { data: PageData } = $props();
</script>

{#if data.config?.homepage}
  <IframePanel url={data.config.homepage} title="Dashboard" />
{:else}
  <div class="welcome">
    <div class="welcome-icon">
      <Icon name={data.config?.icon || 'home'} size={28} />
    </div>
    <h1>{data.config?.name || 'Portal'}</h1>
    <p>Select an app from the sidebar to get started.</p>
  </div>
{/if}

<style>
  .welcome {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    gap: 12px;
  }

  .welcome-icon {
    width: 56px;
    height: 56px;
    border-radius: 14px;
    background: color-mix(in srgb, var(--theme-color) 10%, var(--bg-elevated));
    color: var(--theme-color);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 4px;
    border: 1px solid color-mix(in srgb, var(--theme-color) 15%, transparent);
  }

  h1 {
    font-family: var(--font-display);
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.03em;
    color: var(--text-primary);
  }

  p {
    font-size: 14px;
    color: var(--text-muted);
  }
</style>
