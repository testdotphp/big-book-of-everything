<script lang="ts">
  import Sidebar from '$lib/components/Sidebar.svelte';
  import type { LayoutData } from './$types';
  import '../app.css';

  let { data, children } = $props();

  let sidebarCollapsed = $state(false);
</script>

<svelte:head>
  <title>{data.config?.name || 'Portal'}</title>
</svelte:head>

{#if data.session?.user}
  <div class="shell" style="--theme-color: {data.config?.theme || '#1976D2'}">
    <Sidebar
      config={data.config}
      user={data.session.user}
      bind:collapsed={sidebarCollapsed}
      bookEnabled={data.bookEnabled}
    />
    <main class="content" class:expanded={sidebarCollapsed}>
      {@render children()}
    </main>
  </div>
{:else}
  {@render children()}
{/if}
