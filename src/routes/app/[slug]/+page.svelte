<script lang="ts">
  import IframePanel from '$lib/components/IframePanel.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>{data.app.label} | {data.config?.name || 'Portal'}</title>
</svelte:head>

<IframePanel url={data.app.url} title={data.app.label} />
