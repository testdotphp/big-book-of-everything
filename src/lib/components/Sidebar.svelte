<script lang="ts">
  import { page } from '$app/stores';
  import NavItem from './NavItem.svelte';
  import { isNavGroup } from '$lib/types';
  import type { PortalConfig } from '$lib/types';

  interface Props {
    config: PortalConfig;
    user: { name?: string | null; email?: string | null; image?: string | null };
    collapsed: boolean;
  }

  let { config, user, collapsed = $bindable(false) }: Props = $props();

  let currentSlug = $derived($page.params.slug || '');
</script>

<aside class="sidebar" class:collapsed>
  <div class="sidebar-header">
    <button class="toggle-btn" onclick={() => (collapsed = !collapsed)} aria-label="Toggle sidebar">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        {#if collapsed}
          <path d="M9 18l6-6-6-6" />
        {:else}
          <path d="M15 18l-6-6 6-6" />
        {/if}
      </svg>
    </button>
    {#if !collapsed}
      <span class="portal-name">{config.name}</span>
    {/if}
  </div>

  <nav class="nav">
    {#each config.items as item}
      {#if isNavGroup(item)}
        <div class="nav-group">
          {#if !collapsed}
            <span class="group-label">{item.label}</span>
          {/if}
          {#each item.children as child}
            <NavItem item={child} active={currentSlug === child.slug} {collapsed} />
          {/each}
        </div>
      {:else}
        <NavItem {item} active={currentSlug === item.slug} {collapsed} />
      {/if}
    {/each}
  </nav>

  <div class="sidebar-footer">
    {#if !collapsed}
      <div class="user-info">
        <div class="user-avatar">
          {user.name?.charAt(0).toUpperCase() || '?'}
        </div>
        <div class="user-details">
          <span class="user-name">{user.name || 'User'}</span>
          <span class="user-email">{user.email || ''}</span>
        </div>
      </div>
    {:else}
      <div class="user-avatar small">
        {user.name?.charAt(0).toUpperCase() || '?'}
      </div>
    {/if}
    <a href="/auth/signout" class="signout-btn" title="Sign out">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>
    </a>
  </div>
</aside>

<style>
  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    width: var(--sidebar-width);
    background: var(--bg-primary);
    border-right: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
    transition: width 0.2s ease;
    z-index: 100;
    overflow: hidden;
  }

  .sidebar.collapsed {
    width: var(--sidebar-collapsed-width);
  }

  .sidebar-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px;
    border-bottom: 1px solid var(--border-color);
    min-height: 52px;
  }

  .toggle-btn {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .toggle-btn:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  .portal-name {
    font-weight: 600;
    font-size: 14px;
    color: var(--theme-color);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .nav {
    flex: 1;
    overflow-y: auto;
    padding: 8px 0;
  }

  .nav-group {
    margin-top: 8px;
  }

  .group-label {
    display: block;
    padding: 4px 16px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted);
  }

  .sidebar-footer {
    border-top: 1px solid var(--border-color);
    padding: 8px 12px;
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 56px;
  }

  .user-info {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    min-width: 0;
  }

  .user-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--theme-color);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 600;
    flex-shrink: 0;
  }

  .user-avatar.small {
    width: 28px;
    height: 28px;
    font-size: 12px;
  }

  .user-details {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .user-name {
    font-size: 13px;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .user-email {
    font-size: 11px;
    color: var(--text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .signout-btn {
    color: var(--text-secondary);
    padding: 4px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }

  .signout-btn:hover {
    background: var(--bg-hover);
    color: #e57373;
  }

  /* Scrollbar styling */
  .nav::-webkit-scrollbar {
    width: 4px;
  }
  .nav::-webkit-scrollbar-track {
    background: transparent;
  }
  .nav::-webkit-scrollbar-thumb {
    background: var(--border-color);
    border-radius: 2px;
  }

  /* Mobile */
  @media (max-width: 768px) {
    .sidebar {
      width: var(--sidebar-collapsed-width);
    }
    .sidebar:not(.collapsed) {
      width: 280px;
      box-shadow: 4px 0 20px rgba(0, 0, 0, 0.5);
    }
  }
</style>
