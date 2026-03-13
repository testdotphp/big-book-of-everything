<script lang="ts">
  import { page } from '$app/stores';
  import { fade } from 'svelte/transition';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import Toast from '$lib/components/Toast.svelte';
  import { iconPackData } from '$lib/stores/icon-pack';
  import type { LayoutData } from './$types';
  import '../app.css';

  let { data, children } = $props();

  let sidebarCollapsed = $state(false);
  let mobileMenuOpen = $state(false);

  // Apply theme from server and sync to localStorage
  $effect(() => {
    const theme = data.theme || 'dark';
    if (theme === 'dark') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
    localStorage.setItem('theme', theme);
  });

  // Set icon pack store from server data
  $effect(() => {
    iconPackData.set(data.iconPackIcons || null);
  });

  // Close mobile menu on navigation
  let prevPath = $state('');
  $effect(() => {
    const path = $page.url.pathname;
    if (prevPath && path !== prevPath) mobileMenuOpen = false;
    prevPath = path;
  });
</script>

<svelte:head>
  <title>{data.config?.name || 'Portal'}</title>
</svelte:head>

{#if data.session?.user || data.bookMode}
  <div class="shell" style="--theme-color: {data.config?.theme || '#1976D2'}">
    {#if mobileMenuOpen}
      <div class="mobile-backdrop" transition:fade={{ duration: 150 }} onclick={() => mobileMenuOpen = false}></div>
    {/if}
    <div class="sidebar-wrap" class:mobile-open={mobileMenuOpen}>
      <Sidebar
        config={data.config}
        user={data.session?.user || { name: 'Book', email: '' }}
        bind:collapsed={sidebarCollapsed}
        bookEnabled={data.bookEnabled}
        bookMode={data.bookMode}
        bookCategories={data.bookCategories}
        localAuth={data.localAuth}
      />
    </div>
    <main class="content" class:expanded={sidebarCollapsed}>
      <button class="mobile-menu-btn" onclick={() => mobileMenuOpen = !mobileMenuOpen} aria-label="Open menu">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
      </button>
      <div class="page-content" in:fade={{ duration: 120 }}>
        {@render children()}
      </div>
    </main>
  </div>
{:else}
  {@render children()}
{/if}

<Toast />
