<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import { enhance } from '$app/forms';
  import { ChevronRight, CheckCircle, XCircle, CloudUpload, RotateCcw, Trash2, Palette, Package, Download, Check, X } from 'lucide-svelte';
  import Icon from '$lib/components/Icon.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let provider = $state(data.provider || '');
  let status = $state<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  let loading = $state(false);
  let backups = $state<{ filename: string; size: number; modified: string }[]>([]);
  let loadingBackups = $state(false);

  // Provider-specific fields
  let webdavUrl = $state('');
  let webdavUsername = $state('');
  let webdavPassword = $state('');
  let webdavPath = $state('/big-book-backups');

  let dropboxToken = $state('');
  let dropboxPath = $state('/big-book-backups');

  let gdClientId = $state('');
  let gdClientSecret = $state('');
  let gdRefreshToken = $state('');
  let gdFolderId = $state('');

  let s3Endpoint = $state('');
  let s3Region = $state('us-east-1');
  let s3Bucket = $state('');
  let s3AccessKey = $state('');
  let s3SecretKey = $state('');
  let s3Prefix = $state('big-book-backups');

  function buildConfig() {
    switch (provider) {
      case 'webdav':
        return { provider: 'webdav', url: webdavUrl, username: webdavUsername, password: webdavPassword, path: webdavPath };
      case 'dropbox':
        return { provider: 'dropbox', accessToken: dropboxToken, path: dropboxPath };
      case 'google-drive':
        return { provider: 'google-drive', clientId: gdClientId, clientSecret: gdClientSecret, refreshToken: gdRefreshToken, folderId: gdFolderId };
      case 's3':
        return { provider: 's3', endpoint: s3Endpoint, region: s3Region, bucket: s3Bucket, accessKeyId: s3AccessKey, secretAccessKey: s3SecretKey, prefix: s3Prefix };
      default:
        return null;
    }
  }

  async function testConnection() {
    const config = buildConfig();
    if (!config) return;
    loading = true;
    status = { type: 'info', message: 'Testing connection...' };
    try {
      const res = await fetch('/api/book/backup?action=test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const result = await res.json();
      status = result.ok
        ? { type: 'success', message: result.message }
        : { type: 'error', message: result.message };
    } catch (err) {
      status = { type: 'error', message: 'Request failed' };
    }
    loading = false;
  }

  async function saveConfig() {
    const config = buildConfig();
    if (!config) return;
    loading = true;
    try {
      await fetch('/api/book/backup?action=config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      status = { type: 'success', message: 'Configuration saved' };
      await invalidateAll();
    } catch {
      status = { type: 'error', message: 'Failed to save' };
    }
    loading = false;
  }

  async function backupNow(format: string) {
    loading = true;
    status = { type: 'info', message: 'Backing up...' };
    try {
      const res = await fetch(`/api/book/backup?action=backup&format=${format}`, { method: 'POST' });
      const result = await res.json();
      if (res.ok) {
        status = { type: 'success', message: `Backed up as ${result.filename}` };
        await loadCloudBackups();
        await invalidateAll();
      } else {
        status = { type: 'error', message: result.message || 'Backup failed' };
      }
    } catch {
      status = { type: 'error', message: 'Backup request failed' };
    }
    loading = false;
  }

  async function loadCloudBackups() {
    loadingBackups = true;
    try {
      const res = await fetch('/api/book/backup?action=list');
      const result = await res.json();
      backups = result.backups || [];
    } catch {
      backups = [];
    }
    loadingBackups = false;
  }

  async function restoreFromCloud(filename: string) {
    if (!confirm(`Restore from "${filename}"? This will replace all current data.`)) return;
    loading = true;
    status = { type: 'info', message: 'Restoring...' };
    try {
      const res = await fetch('/api/book/backup?action=restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename })
      });
      if (res.ok) {
        status = { type: 'success', message: 'Restored successfully' };
        await invalidateAll();
      } else {
        const result = await res.json();
        status = { type: 'error', message: result.message || 'Restore failed' };
      }
    } catch {
      status = { type: 'error', message: 'Restore request failed' };
    }
    loading = false;
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function formatDate(iso: string): string {
    if (!iso) return '';
    return new Date(iso).toLocaleString();
  }

  // Theme picker
  const themes = [
    { slug: 'dark', name: 'Dark', colors: ['#0c0c14', '#12121e', '#181828', '#ececf1'] },
    { slug: 'light', name: 'Light', colors: ['#f5f5f7', '#ffffff', '#f0f0f3', '#1a1a1e'] },
    { slug: 'nord', name: 'Nord', colors: ['#2e3440', '#3b4252', '#434c5e', '#eceff4'] },
    { slug: 'dracula', name: 'Dracula', colors: ['#1e1f29', '#282a36', '#2d2f3f', '#f8f8f2'] },
    { slug: 'solarized-light', name: 'Solarized', colors: ['#fdf6e3', '#eee8d5', '#e8e1cc', '#073642'] }
  ];

  let selectedTheme = $state(data.theme || 'dark');

  // Icon packs
  let iconPackLoading = $state<string | null>(null);

  // Load backups on mount if provider is configured
  $effect(() => {
    if (data.provider) loadCloudBackups();
  });
</script>

<svelte:head>
  <title>Settings | Big Book</title>
</svelte:head>

<nav class="breadcrumb">
  <a href="/book">Big Book</a>
  <ChevronRight size={14} strokeWidth={2} />
  <span>Settings</span>
</nav>

<h1>Settings</h1>

<h2 class="section-heading">Appearance</h2>
<p class="subtitle">Theme and icon customization.</p>

<div class="settings-card">
  <h3 class="card-title"><Palette size={16} strokeWidth={2} /> Theme</h3>
  <div class="theme-grid">
    {#each themes as theme}
      <form method="POST" action="?/setTheme" use:enhance={() => {
        selectedTheme = theme.slug;
        return async ({ update }) => {
          await update();
          await invalidateAll();
        };
      }}>
        <input type="hidden" name="theme" value={theme.slug} />
        <button
          type="submit"
          class="theme-option"
          class:active={selectedTheme === theme.slug}
        >
          <div class="theme-swatches">
            {#each theme.colors as color}
              <span class="swatch" style="background: {color}"></span>
            {/each}
          </div>
          <span class="theme-name">{theme.name}</span>
        </button>
      </form>
    {/each}
  </div>
</div>

<div class="settings-card">
  <h3 class="card-title"><Package size={16} strokeWidth={2} /> Icon Pack</h3>
  <p class="card-desc">Choose an icon style for categories and sections. Lucide is the built-in default. Additional icon packs will be available in a future update.</p>

  <div class="icon-pack-grid">
    {#each data.iconRegistry as pack}
      {@const isActive = data.activeIconPack === pack.slug}
      {@const isDownloaded = data.downloadedPacks.includes(pack.slug)}
      {@const isLucide = pack.slug === 'lucide'}
      <div class="icon-pack-card" class:active={isActive}>
        <div class="pack-header">
          <span class="pack-name">{pack.name}</span>
          {#if isActive}
            <span class="pack-badge active-badge">Active</span>
          {:else if isDownloaded || isLucide}
            <span class="pack-badge downloaded-badge">Ready</span>
          {/if}
        </div>
        <p class="pack-desc">{pack.description}</p>
        <div class="pack-preview">
          {#each pack.preview as iconName}
            <span class="preview-icon"><Icon name={iconName} size={16} /></span>
          {/each}
        </div>
        <div class="pack-meta">{pack.author} &middot; {pack.license}</div>
        <div class="pack-actions">
          {#if isActive}
            <span class="pack-status"><Check size={13} strokeWidth={2.5} /> In use</span>
          {:else if isLucide}
            <form method="POST" action="?/activateIconPack" use:enhance={() => {
              iconPackLoading = pack.slug;
              return async ({ update }) => { await update(); iconPackLoading = null; await invalidateAll(); };
            }}>
              <input type="hidden" name="slug" value={pack.slug} />
              <button type="submit" class="btn small" disabled={iconPackLoading !== null}>
                <Check size={13} strokeWidth={2} /> Activate
              </button>
            </form>
          {:else if isDownloaded}
            <form method="POST" action="?/activateIconPack" use:enhance={() => {
              iconPackLoading = pack.slug;
              return async ({ update }) => { await update(); iconPackLoading = null; await invalidateAll(); };
            }}>
              <input type="hidden" name="slug" value={pack.slug} />
              <button type="submit" class="btn small" disabled={iconPackLoading !== null}>
                <Check size={13} strokeWidth={2} /> Activate
              </button>
            </form>
            <form method="POST" action="?/removeIconPack" use:enhance={() => {
              iconPackLoading = pack.slug;
              return async ({ update }) => { await update(); iconPackLoading = null; await invalidateAll(); };
            }}>
              <input type="hidden" name="slug" value={pack.slug} />
              <button type="submit" class="btn small danger" disabled={iconPackLoading !== null}>
                <X size={13} strokeWidth={2} /> Remove
              </button>
            </form>
          {:else}
            <form method="POST" action="?/downloadIconPack" use:enhance={() => {
              iconPackLoading = pack.slug;
              return async ({ update }) => { await update(); iconPackLoading = null; await invalidateAll(); };
            }}>
              <input type="hidden" name="slug" value={pack.slug} />
              <button type="submit" class="btn small" disabled={iconPackLoading !== null}>
                {#if iconPackLoading === pack.slug}
                  Installing...
                {:else}
                  <Download size={13} strokeWidth={2} /> Download
                {/if}
              </button>
            </form>
          {/if}
        </div>
      </div>
    {/each}
  </div>
</div>

<h2 class="section-heading">Data &amp; Backup</h2>
<p class="subtitle">Cloud backup, export, and restore options.</p>

{#if status}
  <div class="status" class:success={status.type === 'success'} class:error={status.type === 'error'} class:info={status.type === 'info'}>
    {#if status.type === 'success'}<CheckCircle size={16} strokeWidth={2} />{/if}
    {#if status.type === 'error'}<XCircle size={16} strokeWidth={2} />{/if}
    <span>{status.message}</span>
    <button class="status-close" onclick={() => status = null}>&times;</button>
  </div>
{/if}

<div class="settings-card">
  <h3 class="card-title">Provider</h3>
  <select class="select" bind:value={provider}>
    <option value="">Select a provider...</option>
    <option value="webdav">WebDAV (Nextcloud, ownCloud, Synology)</option>
    <option value="dropbox">Dropbox</option>
    <option value="google-drive">Google Drive</option>
    <option value="s3">S3-Compatible (AWS, MinIO, Backblaze B2)</option>
  </select>

  {#if provider === 'webdav'}
    <div class="fields">
      <label>
        <span>Server URL</span>
        <input type="url" bind:value={webdavUrl} placeholder="https://cloud.example.com/remote.php/dav/files/username" />
      </label>
      <label>
        <span>Username</span>
        <input type="text" bind:value={webdavUsername} placeholder="username" />
      </label>
      <label>
        <span>Password</span>
        <input type="password" bind:value={webdavPassword} placeholder="password or app token" />
      </label>
      <label>
        <span>Backup Path</span>
        <input type="text" bind:value={webdavPath} placeholder="/big-book-backups" />
      </label>
    </div>
  {/if}

  {#if provider === 'dropbox'}
    <div class="fields">
      <label>
        <span>Access Token</span>
        <input type="password" bind:value={dropboxToken} placeholder="sl...." />
      </label>
      <label>
        <span>Backup Path</span>
        <input type="text" bind:value={dropboxPath} placeholder="/big-book-backups" />
      </label>
      <p class="hint">Generate an access token at <a href="https://www.dropbox.com/developers/apps" target="_blank" rel="noopener">dropbox.com/developers/apps</a></p>
    </div>
  {/if}

  {#if provider === 'google-drive'}
    <div class="fields">
      <label>
        <span>Client ID</span>
        <input type="text" bind:value={gdClientId} placeholder="xxxx.apps.googleusercontent.com" />
      </label>
      <label>
        <span>Client Secret</span>
        <input type="password" bind:value={gdClientSecret} placeholder="GOCSPX-..." />
      </label>
      <label>
        <span>Refresh Token</span>
        <input type="password" bind:value={gdRefreshToken} placeholder="1//..." />
      </label>
      <label>
        <span>Folder ID</span>
        <input type="text" bind:value={gdFolderId} placeholder="1abc...xyz" />
      </label>
      <p class="hint">Requires a Google Cloud project with Drive API enabled. Folder ID is in the URL when viewing the folder.</p>
    </div>
  {/if}

  {#if provider === 's3'}
    <div class="fields">
      <label>
        <span>Endpoint URL</span>
        <input type="url" bind:value={s3Endpoint} placeholder="https://s3.us-east-1.amazonaws.com (or MinIO/B2 URL)" />
      </label>
      <label>
        <span>Region</span>
        <input type="text" bind:value={s3Region} placeholder="us-east-1" />
      </label>
      <label>
        <span>Bucket</span>
        <input type="text" bind:value={s3Bucket} placeholder="my-backups" />
      </label>
      <label>
        <span>Access Key ID</span>
        <input type="text" bind:value={s3AccessKey} placeholder="AKIA..." />
      </label>
      <label>
        <span>Secret Access Key</span>
        <input type="password" bind:value={s3SecretKey} placeholder="secret" />
      </label>
      <label>
        <span>Key Prefix</span>
        <input type="text" bind:value={s3Prefix} placeholder="big-book-backups" />
      </label>
    </div>
  {/if}

  {#if provider}
    <div class="actions">
      <button class="btn secondary" onclick={testConnection} disabled={loading}>Test Connection</button>
      <button class="btn primary" onclick={saveConfig} disabled={loading}>Save Configuration</button>
    </div>
  {/if}
</div>

{#if data.provider}
  <div class="settings-card">
    <h3 class="card-title">Backup Now</h3>
    <p class="card-desc">
      {#if data.lastBackup}
        Last backup: {formatDate(data.lastBackup)}
      {:else}
        No backups yet.
      {/if}
    </p>
    <div class="actions">
      <button class="btn primary" onclick={() => backupNow('json')} disabled={loading}>
        <CloudUpload size={15} strokeWidth={2} />
        Backup as JSON
      </button>
      <button class="btn secondary" onclick={() => backupNow('sqlite')} disabled={loading}>
        <CloudUpload size={15} strokeWidth={2} />
        Backup as Database
      </button>
    </div>
  </div>

  <div class="settings-card">
    <h3 class="card-title">Cloud Backups</h3>
    {#if loadingBackups}
      <p class="card-desc">Loading...</p>
    {:else if backups.length === 0}
      <p class="card-desc">No backups found in cloud storage.</p>
    {:else}
      <div class="backup-list">
        {#each backups as backup}
          <div class="backup-row">
            <div class="backup-info">
              <span class="backup-name">{backup.filename}</span>
              <span class="backup-meta">{formatSize(backup.size)} &middot; {formatDate(backup.modified)}</span>
            </div>
            <button class="btn small" onclick={() => restoreFromCloud(backup.filename)} disabled={loading}>
              <RotateCcw size={13} strokeWidth={2} />
              Restore
            </button>
          </div>
        {/each}
      </div>
      <button class="btn text" onclick={loadCloudBackups} disabled={loadingBackups}>Refresh list</button>
    {/if}
  </div>
{/if}

<style>
  .breadcrumb {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--text-muted);
    margin-bottom: 24px;
  }

  .breadcrumb a {
    color: var(--text-secondary);
    transition: color 0.15s;
  }

  .breadcrumb a:hover {
    color: var(--theme-color);
  }

  h1 {
    font-family: var(--font-display);
    font-size: 20px;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 4px;
  }

  .subtitle {
    font-size: 13px;
    color: var(--text-muted);
    margin-bottom: 24px;
  }

  .status {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    border-radius: var(--radius-md);
    font-size: 13px;
    margin-bottom: 16px;
  }

  .status.success {
    background: rgba(34, 197, 94, 0.1);
    color: #22c55e;
    border: 1px solid rgba(34, 197, 94, 0.2);
  }

  .status.error {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
    border: 1px solid rgba(239, 68, 68, 0.2);
  }

  .status.info {
    background: color-mix(in srgb, var(--theme-color) 10%, transparent);
    color: var(--theme-color);
    border: 1px solid color-mix(in srgb, var(--theme-color) 20%, transparent);
  }

  .status span { flex: 1; }

  .status-close {
    background: none;
    border: none;
    color: inherit;
    font-size: 18px;
    cursor: pointer;
    padding: 0 4px;
    opacity: 0.6;
  }

  .settings-card {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    padding: 24px;
    margin-bottom: 16px;
  }

  h2 {
    font-family: var(--font-display);
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 12px;
  }

  .card-title {
    font-family: var(--font-display);
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 12px;
  }

  .card-title :global(svg) {
    vertical-align: -2px;
    margin-right: 4px;
  }

  .card-desc {
    font-size: 13px;
    color: var(--text-muted);
    margin-bottom: 12px;
  }

  .select {
    width: 100%;
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-family: var(--font-body);
    font-size: 13px;
    padding: 9px 12px;
    margin-bottom: 4px;
  }

  .select:focus {
    outline: none;
    border-color: var(--theme-color);
  }

  .fields {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-top: 16px;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  label span {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  label input {
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-family: var(--font-body);
    font-size: 13px;
    padding: 9px 12px;
  }

  label input:focus {
    outline: none;
    border-color: var(--theme-color);
  }

  .hint {
    font-size: 12px;
    color: var(--text-muted);
    margin-top: 4px;
  }

  .hint a {
    color: var(--theme-color);
  }

  .actions {
    display: flex;
    gap: 8px;
    margin-top: 16px;
    flex-wrap: wrap;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    border-radius: var(--radius-sm);
    font-family: var(--font-body);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    border: none;
    transition: background 0.15s, opacity 0.15s;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn.primary {
    background: var(--theme-color);
    color: white;
  }

  .btn.primary:hover:not(:disabled) {
    opacity: 0.9;
  }

  .btn.secondary {
    background: var(--bg-primary);
    color: var(--text-secondary);
    border: 1px solid var(--border-color);
  }

  .btn.secondary:hover:not(:disabled) {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  .btn.small {
    padding: 5px 10px;
    font-size: 12px;
    background: var(--bg-primary);
    color: var(--text-secondary);
    border: 1px solid var(--border-color);
  }

  .btn.small:hover:not(:disabled) {
    border-color: var(--theme-color);
    color: var(--theme-color);
  }

  .btn.text {
    background: none;
    color: var(--text-muted);
    padding: 6px 0;
    margin-top: 8px;
  }

  .btn.text:hover:not(:disabled) {
    color: var(--theme-color);
  }

  .backup-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .backup-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
    background: var(--bg-primary);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
  }

  .backup-info {
    flex: 1;
    min-width: 0;
  }

  .backup-name {
    display: block;
    font-size: 13px;
    font-weight: 500;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .backup-meta {
    font-size: 11px;
    color: var(--text-muted);
  }

  .section-heading {
    font-family: var(--font-display);
    font-size: 18px;
    font-weight: 700;
    color: var(--text-primary);
    margin-top: 32px;
    margin-bottom: 4px;
  }

  .theme-grid {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .theme-option {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    background: var(--bg-primary);
    border: 2px solid var(--border-color);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
    min-width: 90px;
    font-family: var(--font-body);
  }

  .theme-option:hover {
    border-color: var(--text-muted);
  }

  .theme-option.active {
    border-color: var(--theme-color);
    background: color-mix(in srgb, var(--theme-color) 8%, var(--bg-primary));
  }

  .theme-swatches {
    display: flex;
    gap: 4px;
  }

  .swatch {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 1px solid rgba(128, 128, 128, 0.3);
  }

  .theme-name {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary);
  }

  .theme-option.active .theme-name {
    color: var(--theme-color);
  }

  h2 :global(svg) {
    vertical-align: -2px;
    margin-right: 4px;
  }

  .icon-pack-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 12px;
  }

  .icon-pack-card {
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    transition: border-color 0.15s;
  }

  .icon-pack-card.active {
    border-color: var(--theme-color);
  }

  .pack-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .pack-name {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .pack-badge {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 2px 6px;
    border-radius: 4px;
  }

  .active-badge {
    background: color-mix(in srgb, var(--theme-color) 15%, transparent);
    color: var(--theme-color);
  }

  .downloaded-badge {
    background: rgba(34, 197, 94, 0.12);
    color: #22c55e;
  }

  .pack-desc {
    font-size: 12px;
    color: var(--text-muted);
    line-height: 1.4;
  }

  .pack-preview {
    display: flex;
    gap: 6px;
    color: var(--text-secondary);
    padding: 6px 0;
  }

  .preview-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .pack-meta {
    font-size: 11px;
    color: var(--text-muted);
  }

  .pack-actions {
    display: flex;
    gap: 6px;
    margin-top: 4px;
    align-items: center;
  }

  .pack-actions form {
    display: contents;
  }

  .pack-status {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    font-weight: 600;
    color: var(--theme-color);
  }

  .btn.danger {
    color: #ef4444;
    border-color: rgba(239, 68, 68, 0.3);
  }

  .btn.danger:hover:not(:disabled) {
    background: rgba(239, 68, 68, 0.1);
    border-color: #ef4444;
  }
</style>
