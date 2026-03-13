<script lang="ts">
  import { page } from '$app/stores';
  import { invalidateAll } from '$app/navigation';
  import NavItem from './NavItem.svelte';
  import Icon from './Icon.svelte';
  import { isNavGroup } from '$lib/types';
  import type { PortalConfig } from '$lib/types';
  import { LogOut, ChevronLeft, ChevronRight, ChevronDown, Plus, X, Settings, HardDriveDownload, HardDriveUpload, Database, FileJson, RefreshCw } from 'lucide-svelte';

  interface BookCategory {
    id: number;
    name: string;
    slug: string;
    icon: string | null;
    seeded: number;
    sections: { id: number; name: string; slug: string; type: string; seeded: number }[];
  }

  interface Props {
    config: PortalConfig;
    user: { name?: string | null; email?: string | null; image?: string | null };
    collapsed: boolean;
    bookEnabled?: boolean;
    bookMode?: boolean;
    bookCategories?: BookCategory[];
  }

  let { config, user, collapsed = $bindable(false), bookEnabled = false, bookMode = false, bookCategories = [] }: Props = $props();

  let currentSlug = $derived($page.params.slug || '');

  // Track which group contains the active slug
  function groupContainsSlug(group: { children: { slug: string }[] }, slug: string): boolean {
    return group.children.some(c => c.slug === slug);
  }

  // Collapsed groups — start with all collapsed, active group auto-expands via $derived
  let manualToggles = $state<Record<string, boolean>>({});

  function isGroupExpanded(groupSlug: string): boolean {
    if (groupSlug in manualToggles) return manualToggles[groupSlug];
    // Auto-expand Records group when Big Book is active
    if (bookEnabled && groupSlug === 'label-records' && $page.url.pathname.startsWith('/book')) return true;
    // Auto-expand only the group containing the active page
    const group = config.items.find(i => isNavGroup(i) && i.slug === groupSlug);
    if (group && isNavGroup(group)) return groupContainsSlug(group, currentSlug);
    return false;
  }

  function toggleGroup(groupSlug: string) {
    manualToggles[groupSlug] = !isGroupExpanded(groupSlug);
  }

  // Book category expand/collapse
  let bookCatToggles = $state<Record<string, boolean>>({});

  function isBookCatExpanded(catSlug: string): boolean {
    if (catSlug in bookCatToggles) return bookCatToggles[catSlug];
    // Auto-expand category containing the active section
    const currentCatSlug = $page.params.category;
    return catSlug === currentCatSlug;
  }

  function toggleBookCat(catSlug: string) {
    bookCatToggles[catSlug] = !isBookCatExpanded(catSlug);
  }

  // Inline add forms
  let addingCategory = $state(false);
  let newCategoryName = $state('');
  let addingSectionForCat = $state<number | null>(null);
  let newSectionName = $state('');

  async function addCategory() {
    const name = newCategoryName.trim();
    if (!name) return;
    await fetch('/api/book/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    newCategoryName = '';
    addingCategory = false;
    await invalidateAll();
  }

  async function deleteCategory(id: number) {
    await fetch(`/api/book/categories?id=${id}`, { method: 'DELETE' });
    await invalidateAll();
  }

  async function addSection(categoryId: number) {
    const name = newSectionName.trim();
    if (!name) return;
    await fetch('/api/book/sections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryId, name, type: 'table' })
    });
    newSectionName = '';
    addingSectionForCat = null;
    await invalidateAll();
  }

  async function deleteSection(id: number) {
    await fetch(`/api/book/sections?id=${id}`, { method: 'DELETE' });
    await invalidateAll();
  }

  function handleCategoryKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') addCategory();
    if (e.key === 'Escape') { addingCategory = false; newCategoryName = ''; }
  }

  function handleSectionKeydown(e: KeyboardEvent, categoryId: number) {
    if (e.key === 'Enter') addSection(categoryId);
    if (e.key === 'Escape') { addingSectionForCat = null; newSectionName = ''; }
  }

  // Update checking (Electron only)
  let updateAvailable = $state(false);
  let updateVersion = $state('');
  let appVersion = $state('');
  let autoUpdate = $state(true);

  const isElectron = typeof window !== 'undefined' && (window as any).electronAPI?.isElectron;

  if (typeof window !== 'undefined' && isElectron) {
    const api = (window as any).electronAPI;
    api.getAppVersion().then((v: string) => { appVersion = v; });
    api.getAutoUpdate().then((v: boolean) => { autoUpdate = v; });
    api.onUpdateStatus((data: any) => {
      updateAvailable = data.updateAvailable;
      updateVersion = data.latestVersion;
      if (!appVersion) appVersion = data.currentVersion;
    });
  }

  function checkForUpdates() {
    if (isElectron) {
      (window as any).electronAPI.checkForUpdates();
    }
    backupMenuOpen = false;
  }

  function toggleAutoUpdate() {
    autoUpdate = !autoUpdate;
    if (isElectron) {
      (window as any).electronAPI.setAutoUpdate(autoUpdate);
    }
  }

  // Backup/restore menu
  let backupMenuOpen = $state(false);
  let importStatus = $state<string | null>(null);
  let fileInput: HTMLInputElement;
  let sqliteInput: HTMLInputElement;

  function toggleBackupMenu() {
    backupMenuOpen = !backupMenuOpen;
    importStatus = null;
  }

  function exportJson() {
    window.location.href = '/api/book/export';
    backupMenuOpen = false;
  }

  function exportSqlite() {
    window.location.href = '/api/book/export?format=sqlite';
    backupMenuOpen = false;
  }

  function triggerJsonImport() {
    fileInput?.click();
  }

  function triggerSqliteImport() {
    sqliteInput?.click();
  }

  async function handleJsonImport(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    importStatus = 'Importing...';
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const res = await fetch('/api/book/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error(await res.text());
      importStatus = 'Restored!';
      await invalidateAll();
      setTimeout(() => { backupMenuOpen = false; importStatus = null; }, 1500);
    } catch (err) {
      importStatus = 'Import failed';
    }
    input.value = '';
  }

  async function handleSqliteImport(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    importStatus = 'Restoring database...';
    try {
      const buffer = await file.arrayBuffer();
      const res = await fetch('/api/book/import?format=sqlite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: buffer
      });
      if (!res.ok) throw new Error(await res.text());
      importStatus = 'Restored!';
      await invalidateAll();
      setTimeout(() => { backupMenuOpen = false; importStatus = null; }, 1500);
    } catch (err) {
      importStatus = 'Restore failed';
    }
    input.value = '';
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
    {#if bookMode && bookEnabled}
      <!-- Book mode: collapsible category tree -->
      {#if !collapsed}
        <div class="book-tree">
          {#each bookCategories as cat}
            {@const expanded = isBookCatExpanded(cat.slug)}
            {@const isActiveCat = $page.params.category === cat.slug}
            <div class="book-cat">
              <button
                class="book-cat-label"
                class:active={isActiveCat}
                onclick={() => toggleBookCat(cat.slug)}
              >
                <span class="book-cat-icon">
                  <Icon name={cat.icon || 'folder'} size={14} />
                </span>
                <span class="book-cat-name">{cat.name}</span>
                <span class="book-cat-chevron" class:expanded>
                  <ChevronDown size={12} strokeWidth={2} />
                </span>
                {#if !cat.seeded}
                  <button
                    class="inline-delete"
                    title="Delete category"
                    onclick={(e) => { e.stopPropagation(); deleteCategory(cat.id); }}
                  >
                    <X size={12} strokeWidth={2} />
                  </button>
                {/if}
              </button>
              <div class="book-cat-children" class:expanded>
                <div class="book-cat-children-inner">
                  {#each cat.sections as sec}
                    {@const isActiveSec = $page.params.category === cat.slug && $page.params.section === sec.slug}
                    <div class="book-sec-row">
                      <a
                        href="/book/{cat.slug}/{sec.slug}"
                        class="book-sec-link"
                        class:active={isActiveSec}
                      >
                        {sec.name}
                      </a>
                      {#if !sec.seeded}
                        <button
                          class="inline-delete sec"
                          title="Delete section"
                          onclick={() => deleteSection(sec.id)}
                        >
                          <X size={10} strokeWidth={2} />
                        </button>
                      {/if}
                    </div>
                  {/each}
                  {#if addingSectionForCat === cat.id}
                    <div class="inline-add-form">
                      <input
                        type="text"
                        class="inline-add-input"
                        placeholder="Section name..."
                        bind:value={newSectionName}
                        onkeydown={(e) => handleSectionKeydown(e, cat.id)}
                        autofocus
                      />
                    </div>
                  {:else}
                    <button
                      class="inline-add-btn"
                      onclick={() => { addingSectionForCat = cat.id; newSectionName = ''; }}
                    >
                      <Plus size={11} strokeWidth={2} />
                      <span>Add section</span>
                    </button>
                  {/if}
                </div>
              </div>
            </div>
          {/each}

          {#if addingCategory}
            <div class="inline-add-form cat">
              <input
                type="text"
                class="inline-add-input"
                placeholder="Category name..."
                bind:value={newCategoryName}
                onkeydown={handleCategoryKeydown}
                autofocus
              />
            </div>
          {:else}
            <button
              class="inline-add-btn cat"
              onclick={() => { addingCategory = true; newCategoryName = ''; }}
            >
              <Plus size={12} strokeWidth={2} />
              <span>Add category</span>
            </button>
          {/if}
        </div>
      {:else}
        <!-- Collapsed: just show book icon -->
        <a
          href="/book"
          class="book-item collapsed"
          class:active={$page.url.pathname.startsWith('/book')}
          title="Big Book"
        >
          <span class="book-icon" class:active={$page.url.pathname.startsWith('/book')}>
            <Icon name="book-open" size={18} />
          </span>
        </a>
      {/if}
    {:else}
      {#each config.items as item}
        {#if isNavGroup(item)}
          {@const expanded = isGroupExpanded(item.slug)}
          <div class="nav-group">
            {#if !collapsed}
              <button
                class="group-label"
                class:has-active={groupContainsSlug(item, currentSlug) || (bookEnabled && item.slug === 'label-records' && $page.url.pathname.startsWith('/book'))}
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
                {#if bookEnabled && item.slug === 'label-records'}
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
                {/if}
              </div>
            </div>
          </div>
        {:else}
          <NavItem {item} active={currentSlug === item.slug} {collapsed} />
        {/if}
      {/each}
    {/if}
  </nav>

  <!-- Hidden file inputs for import -->
  <input type="file" accept=".json" bind:this={fileInput} onchange={handleJsonImport} style="display:none" />
  <input type="file" accept=".db,.sqlite,.sqlite3" bind:this={sqliteInput} onchange={handleSqliteImport} style="display:none" />

  <!-- Backup menu dropdown -->
  {#if backupMenuOpen}
    <div class="backup-menu">
      <div class="backup-menu-title">Backup & Restore</div>
      {#if importStatus}
        <div class="backup-status">{importStatus}</div>
      {:else}
        <button class="backup-menu-item" onclick={exportJson}>
          <FileJson size={15} strokeWidth={1.75} />
          <span>Export JSON</span>
        </button>
        <button class="backup-menu-item" onclick={exportSqlite}>
          <Database size={15} strokeWidth={1.75} />
          <span>Export Database</span>
        </button>
        <div class="backup-divider"></div>
        <button class="backup-menu-item" onclick={triggerJsonImport}>
          <HardDriveUpload size={15} strokeWidth={1.75} />
          <span>Import JSON</span>
        </button>
        <button class="backup-menu-item" onclick={triggerSqliteImport}>
          <HardDriveUpload size={15} strokeWidth={1.75} />
          <span>Import Database</span>
        </button>
        <div class="backup-divider"></div>
        <a href="/book/settings" class="backup-menu-item" onclick={() => backupMenuOpen = false}>
          <Settings size={15} strokeWidth={1.75} />
          <span>Cloud Backup Settings</span>
        </a>
        {#if isElectron}
          <div class="backup-divider"></div>
          <button class="backup-menu-item" onclick={checkForUpdates}>
            <RefreshCw size={15} strokeWidth={1.75} />
            <span>Check for Updates</span>
            {#if updateAvailable}
              <span class="update-badge">New</span>
            {/if}
          </button>
          <button class="backup-menu-item" onclick={toggleAutoUpdate}>
            <span class="auto-update-toggle" class:enabled={autoUpdate}></span>
            <span>Auto-check on startup</span>
          </button>
          {#if appVersion}
            <div class="version-label">v{appVersion}</div>
          {/if}
        {/if}
      {/if}
    </div>
  {/if}

  <!-- Footer -->
  <div class="sidebar-footer">
    {#if !collapsed}
      <div class="sidebar-footer-left">
        {#if bookEnabled}
          <button class="footer-btn" title="Backup & Restore" onclick={toggleBackupMenu}>
            <HardDriveDownload size={16} strokeWidth={1.75} />
            {#if updateAvailable}
              <span class="update-dot"></span>
            {/if}
          </button>
        {/if}
      </div>
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
    {#if !bookMode}
      <a href="/auth/signout" class="signout-btn" title="Sign out">
        <LogOut size={16} strokeWidth={1.75} />
      </a>
    {/if}
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

  /* Book category tree */
  .book-tree {
    padding: 4px 0;
  }

  .book-cat {
    margin-bottom: 1px;
  }

  .book-cat-label {
    display: flex;
    align-items: center;
    width: 100%;
    gap: 8px;
    padding: 7px 12px 7px 14px;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text-secondary);
    font-family: var(--font-display);
    font-size: 13px;
    font-weight: 600;
    letter-spacing: -0.01em;
    transition: color 0.15s, background 0.15s;
    position: relative;
  }

  .book-cat-label:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  .book-cat-label.active {
    color: var(--text-primary);
  }

  .book-cat-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: var(--radius-sm);
    background: color-mix(in srgb, var(--theme-color) 10%, transparent);
    color: var(--theme-color);
    flex-shrink: 0;
  }

  .book-cat-name {
    flex: 1;
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .book-cat-chevron {
    display: flex;
    align-items: center;
    color: var(--text-muted);
    transition: transform 0.2s ease;
    transform: rotate(-90deg);
    flex-shrink: 0;
  }

  .book-cat-chevron.expanded {
    transform: rotate(0deg);
  }

  .book-cat-children {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows 0.2s ease;
  }

  .book-cat-children.expanded {
    grid-template-rows: 1fr;
  }

  .book-cat-children-inner {
    overflow: hidden;
  }

  .book-sec-row {
    display: flex;
    align-items: center;
    position: relative;
  }

  .book-sec-row:hover .inline-delete.sec {
    opacity: 1;
  }

  .book-sec-link {
    display: block;
    flex: 1;
    padding: 5px 12px 5px 46px;
    font-size: 12.5px;
    color: var(--text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: color 0.15s, background 0.15s;
    border-radius: 0;
  }

  .book-sec-link:hover {
    color: var(--text-primary);
    background: var(--bg-hover);
  }

  .book-sec-link.active {
    color: var(--theme-color);
    background: color-mix(in srgb, var(--theme-color) 8%, transparent);
    font-weight: 500;
  }

  /* Inline delete buttons */
  .inline-delete {
    position: absolute;
    right: 8px;
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 3px;
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    opacity: 0;
    transition: opacity 0.15s, color 0.15s, background 0.15s;
  }

  .book-cat-label:hover .inline-delete {
    opacity: 1;
  }

  .inline-delete:hover {
    color: #ef4444;
    background: rgba(239, 68, 68, 0.1);
  }

  .inline-delete.sec {
    right: 6px;
  }

  /* Inline add buttons and forms */
  .inline-add-btn {
    display: flex;
    align-items: center;
    gap: 5px;
    width: 100%;
    padding: 5px 12px 5px 46px;
    background: none;
    border: none;
    color: var(--text-muted);
    font-size: 11.5px;
    font-family: var(--font-body);
    cursor: pointer;
    transition: color 0.15s;
    opacity: 0.6;
  }

  .inline-add-btn:hover {
    color: var(--theme-color);
    opacity: 1;
  }

  .inline-add-btn.cat {
    padding: 8px 14px;
    font-size: 12px;
    gap: 6px;
    border-top: 1px solid var(--border-subtle);
    margin-top: 4px;
  }

  .inline-add-form {
    padding: 3px 12px 3px 46px;
  }

  .inline-add-form.cat {
    padding: 6px 14px;
    border-top: 1px solid var(--border-subtle);
    margin-top: 4px;
  }

  .inline-add-input {
    width: 100%;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-family: var(--font-body);
    font-size: 12px;
    padding: 4px 8px;
  }

  .inline-add-input:focus {
    outline: none;
    border-color: var(--theme-color);
  }

  /* Footer */
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

  .sidebar-footer-left {
    display: flex;
    align-items: center;
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
    position: relative;
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

  /* Backup menu */
  .backup-menu {
    position: absolute;
    bottom: 62px;
    left: 8px;
    right: 8px;
    background: var(--bg-elevated);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    padding: 8px 0;
    box-shadow: var(--shadow-lg);
    z-index: 200;
  }

  .backup-menu-title {
    padding: 6px 14px 8px;
    font-family: var(--font-display);
    font-size: 12px;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .backup-menu-item {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 8px 14px;
    background: none;
    border: none;
    color: var(--text-secondary);
    font-family: var(--font-body);
    font-size: 13px;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
  }

  .backup-menu-item:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  .backup-divider {
    height: 1px;
    margin: 4px 12px;
    background: var(--border-subtle);
  }

  .backup-status {
    padding: 12px 14px;
    font-size: 13px;
    color: var(--theme-color);
    text-align: center;
    font-weight: 500;
  }

  .update-badge {
    margin-left: auto;
    font-size: 10px;
    font-weight: 600;
    padding: 1px 6px;
    border-radius: 8px;
    background: var(--theme-color);
    color: var(--bg-primary);
  }

  .update-dot {
    position: absolute;
    top: 4px;
    right: 4px;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--theme-color);
    border: 1.5px solid var(--bg-primary);
  }

  .auto-update-toggle {
    width: 28px;
    height: 16px;
    border-radius: 8px;
    background: var(--border-color);
    position: relative;
    flex-shrink: 0;
    transition: background 0.2s;
  }

  .auto-update-toggle::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--text-muted);
    transition: transform 0.2s, background 0.2s;
  }

  .auto-update-toggle.enabled {
    background: var(--theme-color);
  }

  .auto-update-toggle.enabled::after {
    transform: translateX(12px);
    background: var(--bg-primary);
  }

  .version-label {
    padding: 4px 14px 2px;
    font-size: 11px;
    color: var(--text-muted);
    opacity: 0.6;
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
