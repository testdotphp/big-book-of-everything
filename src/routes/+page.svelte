<script lang="ts">
  import type { PageData } from './$types';
  import IframePanel from '$lib/components/IframePanel.svelte';

  let { data }: { data: PageData } = $props();
</script>

{#if data.config?.homepage}
  <IframePanel url={data.config.homepage} title="Dashboard" />
{:else}
  <div class="welcome">
    <h1>{data.config?.name || 'Portal'}</h1>
    <p>Select an app from the sidebar.</p>
  </div>
{/if}

<style>
  .welcome {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    color: var(--text-secondary);
  }

  .welcome h1 {
    font-size: 24px;
    font-weight: 600;
    margin-bottom: 8px;
  }

  .welcome p {
    font-size: 14px;
    color: var(--text-muted);
  }
</style>
