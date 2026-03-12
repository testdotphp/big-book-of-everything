<script lang="ts">
  import { page } from '$app/stores';
  import NavItem from './NavItem.svelte';
  import Icon from './Icon.svelte';
  import { isNavGroup } from '$lib/types';
  import type { PortalConfig } from '$lib/types';
  import { LogOut, ChevronLeft, ChevronRight, ChevronDown, HelpCircle } from 'lucide-svelte';

  interface Props {
    config: PortalConfig;
    user: { name?: string | null; email?: string | null; image?: string | null };
    collapsed: boolean;
    bookEnabled?: boolean;
  }

  let { config, user, collapsed = $bindable(false), bookEnabled = false }: Props = $props();

  let currentSlug = $derived($page.params.slug || '');

  // Track which group contains the active slug
  function groupContainsSlug(group: { children: { slug: string }[] }, slug: string): boolean {
    return group.children.some(c => c.slug === slug);
  }

  // Collapsed groups — start with all collapsed, active group auto-expands via $derived
  let manualToggles = $state<Record<string, boolean>>({});

  function isGroupExpanded(groupSlug: string): boolean {
    if (groupSlug in manualToggles) return manualToggles[groupSlug];
    // Auto-expand only the group containing the active page
    const group = config.items.find(i => isNavGroup(i) && i.slug === groupSlug);
    if (group && isNavGroup(group)) return groupContainsSlug(group, currentSlug);
    return false;
  }

  function toggleGroup(groupSlug: string) {
    manualToggles[groupSlug] = !isGroupExpanded(groupSlug);
  }
</script>

<aside class="sidebar" class:collapsed>
  <!-- Header -->
  <div class="sidebar-header">
    <button class="toggle-btn" onclick={() => (collapsed = !collapsed)} aria-label="Toggle sidebar">
      {#if collapsed}
        <ChevronRight size={18} strokeWidth={2} />
      {:else}
        <ChevronLeft size={18} strokeWidth={2} />
      {/if}
    </button>
    {#if !collapsed}
      <div class="portal-identity">
        <span class="portal-icon">
          <Icon name={config.icon} size={16} />
        </span>
        <span class="portal-name">{config.name}</span>
      </div>
    {/if}
  </div>

  <!-- Navigation -->
  <nav class="nav">
    {#if bookEnabled}
      <a
        href="/book"
        class="book-item"
        class:active={$page.url.pathname.startsWith('/book')}
        class:collapsed
        title={collapsed ? 'Big Book' : undefined}
      >
        <span class="book-icon" class:active={$page.url.pathname.startsWith('/book')}>
          <Icon name="book-open" size={18} />
        </span>
        {#if !collapsed}
          <span class="book-label">Big Book</span>
        {/if}
        {#if $page.url.pathname.startsWith('/book') && !collapsed}
          <span class="book-active-dot"></span>
        {/if}
      </a>
      <div class="book-divider"></div>
    {/if}
    {#each config.items as item}
      {#if isNavGroup(item)}
        {@const expanded = isGroupExpanded(item.slug)}
        <div class="nav-group">
          {#if !collapsed}
            <button
              class="group-label"
              class:has-active={groupContainsSlug(item, currentSlug)}
              onclick={() => toggleGroup(item.slug)}
            >
              <span class="group-label-text">{item.label}</span>
              <span class="group-chevron" class:expanded>
                <ChevronDown size={12} strokeWidth={2} />
              </span>
            </button>
          {:else}
            <div class="group-divider"></div>
          {/if}
          <div class="group-children" class:expanded>
            <div class="group-children-inner">
              {#each item.children as child}
                <NavItem item={child} active={currentSlug === child.slug} {collapsed} />
              {/each}
            </div>
          </div>
        </div>
      {:else}
        <NavItem {item} active={currentSlug === item.slug} {collapsed} />
      {/if}
    {/each}
  </nav>

  <!-- Footer -->
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
    <a href="/help" class="footer-btn" title="Setup & Help">
      <HelpCircle size={16} strokeWidth={1.75} />
    </a>
    <a href="/auth/signout" class="signout-btn" title="Sign out">
      <LogOut size={16} strokeWidth={1.75} />
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
    transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 100;
    overflow: hidden;
  }

  .sidebar::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 120px;
    background: linear-gradient(180deg, color-mix(in srgb, var(--theme-color) 6%, transparent), transparent);
    pointer-events: none;
    z-index: 0;
  }

  .sidebar.collapsed {
    width: var(--sidebar-collapsed-width);
  }

  .sidebar-header {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 12px;
    border-bottom: 1px solid var(--border-color);
    min-height: 54px;
  }

  .toggle-btn {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 6px;
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: color 0.15s, background 0.15s;
  }

  .toggle-btn:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  .portal-identity {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .portal-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border-radius: var(--radius-sm);
    background: color-mix(in srgb, var(--theme-color) 15%, transparent);
    color: var(--theme-color);
    flex-shrink: 0;
  }

  .portal-name {
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 14px;
    letter-spacing: -0.02em;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .nav {
    position: relative;
    z-index: 1;
    flex: 1;
    overflow-y: auto;
    padding: 8px 0;
  }

  .nav-group {
    margin-top: 4px;
  }

  .nav-group:first-child {
    margin-top: 0;
  }

  .group-label {
    display: flex;
    align-items: center;
    width: 100%;
    padding: 8px 18px 4px;
    font-family: var(--font-display);
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-muted);
    background: none;
    border: none;
    cursor: pointer;
    transition: color 0.15s;
  }

  .group-label:hover {
    color: var(--text-secondary);
  }

  .group-label.has-active {
    color: var(--text-secondary);
  }

  .group-label-text {
    flex: 1;
    text-align: left;
  }

  .group-chevron {
    display: flex;
    align-items: center;
    transition: transform 0.2s ease;
    transform: rotate(-90deg);
  }

  .group-chevron.expanded {
    transform: rotate(0deg);
  }

  .group-children {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows 0.2s ease;
  }

  .group-children.expanded {
    grid-template-rows: 1fr;
  }

  .group-children-inner {
    overflow: hidden;
  }

  .group-divider {
    height: 1px;
    margin: 6px 12px;
    background: var(--border-subtle);
  }

  .sidebar-footer {
    position: relative;
    z-index: 1;
    border-top: 1px solid var(--border-color);
    padding: 10px 12px;
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 58px;
  }

  .user-info {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
    min-width: 0;
  }

  .user-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: color-mix(in srgb, var(--theme-color) 20%, var(--bg-elevated));
    color: var(--theme-color);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-display);
    font-size: 13px;
    font-weight: 700;
    flex-shrink: 0;
    border: 1px solid color-mix(in srgb, var(--theme-color) 20%, transparent);
  }

  .user-avatar.small {
    width: 28px;
    height: 28px;
    font-size: 11px;
  }

  .user-details {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .user-name {
    font-family: var(--font-display);
    font-size: 13px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--text-primary);
  }

  .user-email {
    font-size: 11px;
    color: var(--text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .footer-btn {
    color: var(--text-muted);
    padding: 6px;
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    flex-shrink: 0;
    transition: color 0.15s, background 0.15s;
  }

  .footer-btn:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  .signout-btn {
    color: var(--text-muted);
    padding: 6px;
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    flex-shrink: 0;
    transition: color 0.15s, background 0.15s;
  }

  .signout-btn:hover {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
  }

  /* Scrollbar */
  .nav::-webkit-scrollbar {
    width: 3px;
  }
  .nav::-webkit-scrollbar-track {
    background: transparent;
  }
  .nav::-webkit-scrollbar-thumb {
    background: var(--border-color);
    border-radius: 3px;
  }
  .nav::-webkit-scrollbar-thumb:hover {
    background: var(--text-muted);
  }

  .book-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 7px 12px;
    margin: 1px 8px;
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    font-family: var(--font-body);
    font-size: 13px;
    font-weight: 400;
    cursor: pointer;
    position: relative;
    transition: color 0.15s, background 0.15s;
  }

  .book-item:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  .book-item.active {
    background: color-mix(in srgb, var(--theme-color) 12%, transparent);
    color: var(--theme-color);
    font-weight: 500;
  }

  .book-item.active:hover {
    background: color-mix(in srgb, var(--theme-color) 18%, transparent);
  }

  .book-item.collapsed {
    justify-content: center;
    padding: 9px 0;
    margin: 1px 6px;
  }

  .book-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    opacity: 0.7;
    transition: opacity 0.15s;
  }

  .book-item:hover .book-icon {
    opacity: 1;
  }

  .book-icon.active {
    opacity: 1;
  }

  .book-label {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .book-active-dot {
    position: absolute;
    right: 10px;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--theme-color);
  }

  .book-divider {
    height: 1px;
    margin: 6px 12px;
    background: var(--border-subtle);
  }

  /* Mobile */
  @media (max-width: 768px) {
    .sidebar {
      width: var(--sidebar-collapsed-width);
    }
    .sidebar:not(.collapsed) {
      width: 280px;
      box-shadow: var(--shadow-lg);
    }
  }
</style>
