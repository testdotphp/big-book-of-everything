<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import { enhance } from '$app/forms';
  import { ChevronRight, CheckCircle, XCircle, CloudUpload, RotateCcw, Trash2, Palette, Package, Download, Check, X, HardDriveDownload, HardDriveUpload, Database, FileJson, Shield, Lock, Unlock, UserCheck, ExternalLink, Users, UserPlus, Type } from 'lucide-svelte';
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

  const fontSizes = [
    { slug: 'small', name: 'Small' },
    { slug: 'medium', name: 'Medium' },
    { slug: 'large', name: 'Large' }
  ];
  let selectedFontSize = $state(data.fontSize || 'medium');

  // Icon packs
  let iconPackLoading = $state<string | null>(null);

  // Local backup state
  let importStatus = $state<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  let jsonInput: HTMLInputElement;
  let sqliteInput: HTMLInputElement;

  function exportJson() {
    window.location.href = '/api/book/export?format=json';
  }

  function exportSqlite() {
    window.location.href = '/api/book/export?format=sqlite';
  }

  async function handleJsonImport(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    importStatus = { type: 'info', message: 'Importing JSON...' };
    try {
      const text = await file.text();
      const res = await fetch('/api/book/import?format=json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: text
      });
      const result = await res.json();
      if (res.ok) {
        importStatus = { type: 'success', message: result.message || 'Import successful' };
        await invalidateAll();
      } else {
        importStatus = { type: 'error', message: result.message || 'Import failed' };
      }
    } catch {
      importStatus = { type: 'error', message: 'Import request failed' };
    }
    input.value = '';
  }

  async function handleSqliteImport(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    importStatus = { type: 'info', message: 'Importing database...' };
    try {
      const res = await fetch('/api/book/import?format=sqlite', {
        method: 'POST',
        body: await file.arrayBuffer()
      });
      const result = await res.json();
      if (res.ok) {
        importStatus = { type: 'success', message: result.message || 'Import successful' };
        await invalidateAll();
      } else {
        importStatus = { type: 'error', message: result.message || 'Import failed' };
      }
    } catch {
      importStatus = { type: 'error', message: 'Import request failed' };
    }
    input.value = '';
  }

  // Encryption state
  let encryptionHasPassword = $state(false);
  let encryptionUnlocked = $state(false);
  let passwordInput = $state('');
  let passwordConfirm = $state('');
  let passwordError = $state('');
  let encryptionLoading = $state(false);
  let showRemoveEncryption = $state(false);

  async function loadEncryptionStatus() {
    try {
      const res = await fetch('/api/book/encryption');
      const data = await res.json();
      encryptionHasPassword = data.hasPassword;
      encryptionUnlocked = data.unlocked;
    } catch { /* ignore */ }
  }

  async function setEncryptionPassword() {
    if (!passwordInput) { passwordError = 'Password required'; return; }
    if (passwordInput !== passwordConfirm) { passwordError = 'Passwords do not match'; return; }
    encryptionLoading = true;
    passwordError = '';
    try {
      const res = await fetch('/api/book/encryption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setPassword', password: passwordInput })
      });
      if (res.ok) {
        passwordInput = '';
        passwordConfirm = '';
        await loadEncryptionStatus();
      } else {
        const err = await res.json().catch(() => ({}));
        passwordError = (err as any).message || 'Failed to set password';
      }
    } catch {
      passwordError = 'Request failed';
    }
    encryptionLoading = false;
  }

  async function unlockEncryption() {
    if (!passwordInput) { passwordError = 'Password required'; return; }
    encryptionLoading = true;
    passwordError = '';
    try {
      const res = await fetch('/api/book/encryption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unlock', password: passwordInput })
      });
      if (res.ok) {
        passwordInput = '';
        await loadEncryptionStatus();
        await invalidateAll();
      } else {
        passwordError = 'Wrong password';
      }
    } catch {
      passwordError = 'Request failed';
    }
    encryptionLoading = false;
  }

  async function lockEncryption() {
    await fetch('/api/book/encryption', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'lock' })
    });
    await loadEncryptionStatus();
    await invalidateAll();
  }

  async function removeEncryptionPassword() {
    if (!passwordInput) { passwordError = 'Password required to remove encryption'; return; }
    encryptionLoading = true;
    passwordError = '';
    try {
      const res = await fetch('/api/book/encryption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'removePassword', password: passwordInput })
      });
      if (res.ok) {
        passwordInput = '';
        await loadEncryptionStatus();
        await invalidateAll();
      } else {
        passwordError = 'Wrong password';
      }
    } catch {
      passwordError = 'Request failed';
    }
    encryptionLoading = false;
  }

  // ---- User management ----
  let newUsername = $state('');
  let newPassword = $state('');
  let newDisplayName = $state('');
  let userStatus = $state<{ type: 'success' | 'error'; message: string } | null>(null);
  let userLoading = $state(false);
  let userList = $state(data.users || []);

  // Current user role from layout session
  let currentRole = $derived((data as any).session?.user?.role || 'user');
  let isAdmin = $derived(currentRole === 'admin');

  async function addUser() {
    if (!newUsername.trim() || !newPassword || newPassword.length < 4) {
      userStatus = { type: 'error', message: 'Username and password (4+ chars) required.' };
      return;
    }
    userLoading = true;
    userStatus = null;
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'addUser', username: newUsername.trim(), password: newPassword, name: newDisplayName.trim() || newUsername.trim() })
      });
      const result = await res.json();
      if (!res.ok) {
        userStatus = { type: 'error', message: result.error || 'Failed to add user.' };
      } else {
        userStatus = { type: 'success', message: `User "${newUsername.trim()}" added.` };
        newUsername = '';
        newPassword = '';
        newDisplayName = '';
        await refreshUsers();
      }
    } catch {
      userStatus = { type: 'error', message: 'Network error.' };
    }
    userLoading = false;
  }

  async function removeUser(username: string) {
    if (!confirm(`Remove user "${username}"? They will lose access to the app.`)) return;
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteUser', username })
      });
      const result = await res.json();
      if (!res.ok) {
        userStatus = { type: 'error', message: result.error || 'Failed to remove user.' };
      } else {
        userStatus = { type: 'success', message: `User "${username}" removed.` };
        await refreshUsers();
      }
    } catch {
      userStatus = { type: 'error', message: 'Network error.' };
    }
  }

  async function refreshUsers() {
    try {
      const res = await fetch('/api/auth');
      const result = await res.json();
      if (result.users) userList = result.users;
    } catch { /* ignore */ }
  }

  // Load encryption status and backups on mount
  $effect(() => {
    loadEncryptionStatus();
  });

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
        // Apply theme immediately for instant visual feedback
        if (theme.slug === 'dark') {
          document.documentElement.removeAttribute('data-theme');
        } else {
          document.documentElement.setAttribute('data-theme', theme.slug);
        }
        return async () => {
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
  <h3 class="card-title"><Type size={16} strokeWidth={2} /> Font Size</h3>
  <div class="font-size-grid">
    {#each fontSizes as fs}
      <form method="POST" action="?/setFontSize" use:enhance={() => {
        selectedFontSize = fs.slug;
        document.documentElement.setAttribute('data-font-size', fs.slug);
        return async () => {
          await invalidateAll();
        };
      }}>
        <input type="hidden" name="fontSize" value={fs.slug} />
        <button
          type="submit"
          class="font-size-option"
          class:active={selectedFontSize === fs.slug}
        >
          <span class="fs-preview" data-size={fs.slug}>Aa</span>
          <span class="fs-name">{fs.name}</span>
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

{#if data.isUsersMode && isAdmin}
<h2 class="section-heading">User Management</h2>
<p class="subtitle">Add and remove users who can access the Big Book.</p>

<div class="settings-card">
  <h3 class="card-title"><Users size={16} strokeWidth={2} /> Users</h3>

  {#if userStatus}
    <div class="status-message {userStatus.type}">
      {#if userStatus.type === 'success'}<CheckCircle size={14} />{:else}<XCircle size={14} />{/if}
      {userStatus.message}
      <button class="close-btn" onclick={() => userStatus = null}><X size={12} /></button>
    </div>
  {/if}

  <div class="user-list">
    {#each userList as user}
      <div class="user-row">
        <div class="user-info">
          <span class="user-name">{user.name}</span>
          <span class="user-username">@{user.username}</span>
          {#if user.role === 'admin'}
            <span class="user-badge admin">Admin</span>
          {/if}
        </div>
        {#if user.role !== 'admin'}
          <button class="btn danger-outline btn-sm" onclick={() => removeUser(user.username)}>
            <Trash2 size={13} strokeWidth={2} />
            Remove
          </button>
        {/if}
      </div>
    {/each}
  </div>

  <div class="add-user-form">
    <h4>Add a new user</h4>
    <div class="form-row">
      <input type="text" placeholder="Username" bind:value={newUsername} class="enc-input" />
      <input type="text" placeholder="Display name" bind:value={newDisplayName} class="enc-input" />
    </div>
    <div class="form-row">
      <input type="password" placeholder="Password (4+ chars)" bind:value={newPassword} class="enc-input" />
      <button class="btn primary" onclick={addUser} disabled={userLoading}>
        <UserPlus size={15} strokeWidth={2} />
        {userLoading ? 'Adding...' : 'Add User'}
      </button>
    </div>
  </div>
</div>
{/if}

<h2 class="section-heading">Data &amp; Backup</h2>
<p class="subtitle">Local and cloud backup, encryption, and restore options.</p>

<div class="settings-card">
  <h3 class="card-title"><HardDriveDownload size={16} strokeWidth={2} /> Local Export</h3>
  <p class="card-desc">Download your data to your device.</p>
  <div class="actions">
    <button class="btn secondary" onclick={exportJson}>
      <FileJson size={15} strokeWidth={2} />
      Export as JSON
    </button>
    <button class="btn secondary" onclick={exportSqlite}>
      <Database size={15} strokeWidth={2} />
      Export as Database
    </button>
  </div>
</div>

<div class="settings-card">
  <h3 class="card-title"><HardDriveUpload size={16} strokeWidth={2} /> Local Import</h3>
  <p class="card-desc">Restore data from a local backup file. This will replace all current data.</p>
  {#if importStatus}
    <div class="status" class:success={importStatus.type === 'success'} class:error={importStatus.type === 'error'} class:info={importStatus.type === 'info'}>
      {#if importStatus.type === 'success'}<CheckCircle size={16} strokeWidth={2} />{/if}
      {#if importStatus.type === 'error'}<XCircle size={16} strokeWidth={2} />{/if}
      <span>{importStatus.message}</span>
      <button class="status-close" onclick={() => importStatus = null}>&times;</button>
    </div>
  {/if}
  <div class="actions">
    <button class="btn secondary" onclick={() => jsonInput.click()}>
      <FileJson size={15} strokeWidth={2} />
      Import JSON
    </button>
    <button class="btn secondary" onclick={() => sqliteInput.click()}>
      <Database size={15} strokeWidth={2} />
      Import Database
    </button>
  </div>
  <input bind:this={jsonInput} type="file" accept=".json" class="hidden-input" onchange={handleJsonImport} />
  <input bind:this={sqliteInput} type="file" accept=".db,.sqlite,.sqlite3" class="hidden-input" onchange={handleSqliteImport} />
</div>

<div class="settings-card">
  <h3 class="card-title"><Shield size={16} strokeWidth={2} /> Encryption</h3>
  {#if !encryptionHasPassword}
    <p class="card-desc">Protect sensitive fields (SSN, passwords, account numbers) with a password. Once set, sensitive data is encrypted at rest.</p>
    <div class="encryption-form">
      <input type="password" class="enc-input" placeholder="Set encryption password..." bind:value={passwordInput} />
      <input type="password" class="enc-input" placeholder="Confirm password..." bind:value={passwordConfirm} />
      {#if passwordError}<p class="enc-error">{passwordError}</p>{/if}
      <button class="btn primary" onclick={setEncryptionPassword} disabled={encryptionLoading}>
        <Lock size={14} strokeWidth={2} />
        Set Password
      </button>
    </div>
  {:else if encryptionUnlocked}
    <p class="card-desc">
      <span class="enc-status unlocked"><Unlock size={14} strokeWidth={2} /> Unlocked</span>
      Sensitive fields are decrypted and visible.
    </p>
    <div class="actions">
      <button class="btn secondary" onclick={lockEncryption}>
        <Lock size={14} strokeWidth={2} />
        Lock
      </button>
      <button class="btn danger-outline" onclick={() => { showRemoveEncryption = !showRemoveEncryption; passwordInput = ''; passwordError = ''; }}>
        Remove Encryption
      </button>
    </div>
    {#if showRemoveEncryption}
      <div class="encryption-form" style="margin-top: 12px;">
        <input type="password" class="enc-input" placeholder="Enter current password to confirm..." bind:value={passwordInput}
          onkeydown={(e) => { if (e.key === 'Enter') removeEncryptionPassword(); }} />
        {#if passwordError}<p class="enc-error">{passwordError}</p>{/if}
        <button class="btn small danger" onclick={removeEncryptionPassword} disabled={encryptionLoading}>Confirm Remove</button>
      </div>
    {/if}
  {:else}
    <p class="card-desc">
      <span class="enc-status locked"><Lock size={14} strokeWidth={2} /> Locked</span>
      Sensitive fields are encrypted. Enter your password to view them.
    </p>
    <div class="encryption-form">
      <input type="password" class="enc-input" placeholder="Enter encryption password..." bind:value={passwordInput}
        onkeydown={(e) => { if (e.key === 'Enter') unlockEncryption(); }} />
      {#if passwordError}<p class="enc-error">{passwordError}</p>{/if}
      <button class="btn primary" onclick={unlockEncryption} disabled={encryptionLoading}>
        <Unlock size={14} strokeWidth={2} />
        Unlock
      </button>
    </div>
  {/if}
</div>

<div class="settings-card">
  <h3 class="card-title"><UserCheck size={16} strokeWidth={2} /> Emergency Access</h3>
  <p class="card-desc">Create shareable read-only links for trusted family members or emergency contacts.</p>
  <a href="/book/emergency" class="btn secondary">
    <ExternalLink size={14} strokeWidth={2} />
    Manage Access Links
  </a>
</div>

<h2 class="section-heading">Cloud Backup</h2>
<p class="subtitle">Sync backups to a cloud provider.</p>

{#if status}
  <div class="status" class:success={status.type === 'success'} class:error={status.type === 'error'} class:info={status.type === 'info'}>
    {#if status.type === 'success'}<CheckCircle size={16} strokeWidth={2} />{/if}
    {#if status.type === 'error'}<XCircle size={16} strokeWidth={2} />{/if}
    <span>{status.message}</span>
    <button class="status-close" onclick={() => status = null}>&times;</button>
  </div>
{/if}

<div class="settings-card">
  <h3 class="card-title"><CloudUpload size={16} strokeWidth={2} /> Provider</h3>
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

  .font-size-grid {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .font-size-option {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 12px 20px;
    background: var(--bg-primary);
    border: 2px solid var(--border-color);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
    min-width: 90px;
    font-family: var(--font-body);
  }

  .font-size-option:hover {
    border-color: var(--text-muted);
  }

  .font-size-option.active {
    border-color: var(--theme-color);
    background: color-mix(in srgb, var(--theme-color) 8%, var(--bg-primary));
  }

  .fs-preview {
    font-weight: 600;
    color: var(--text-primary);
  }

  .fs-preview[data-size='small'] {
    font-size: 14px;
  }

  .fs-preview[data-size='medium'] {
    font-size: 20px;
  }

  .fs-preview[data-size='large'] {
    font-size: 26px;
  }

  .fs-name {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary);
  }

  .font-size-option.active .fs-name {
    color: var(--theme-color);
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

  .btn.danger-outline {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    border-radius: var(--radius-sm);
    font-family: var(--font-body);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    background: none;
    color: var(--text-muted);
    border: 1px solid var(--border-color);
    transition: color 0.15s, border-color 0.15s;
  }

  .btn.danger-outline:hover {
    color: #ef4444;
    border-color: #ef4444;
  }

  .hidden-input {
    display: none;
  }

  .encryption-form {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-width: 360px;
  }

  .enc-input {
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-family: var(--font-body);
    font-size: 13px;
    padding: 9px 12px;
  }

  .enc-input:focus {
    outline: none;
    border-color: var(--theme-color);
  }

  .enc-error {
    font-size: 12px;
    color: #ef4444;
  }

  .enc-status {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 2px 8px;
    border-radius: 4px;
    margin-right: 6px;
  }

  .enc-status.unlocked {
    background: rgba(34, 197, 94, 0.12);
    color: #22c55e;
  }

  .enc-status.locked {
    background: rgba(245, 158, 11, 0.12);
    color: #f59e0b;
  }

  /* User management */
  .user-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1.25rem;
  }

  .user-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.625rem 0.75rem;
    background: var(--color-surface-alt, rgba(255,255,255,0.03));
    border-radius: 6px;
  }

  .user-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .user-name {
    font-weight: 500;
    color: var(--color-text);
  }

  .user-username {
    color: var(--color-text-muted);
    font-size: 0.85rem;
  }

  .user-badge {
    font-size: 0.7rem;
    padding: 0.125rem 0.5rem;
    border-radius: 9999px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }

  .user-badge.admin {
    background: var(--color-accent, #4CAF50);
    color: #fff;
  }

  .btn-sm {
    padding: 0.3rem 0.6rem;
    font-size: 0.8rem;
  }

  .add-user-form {
    border-top: 1px solid var(--color-border);
    padding-top: 1rem;
  }

  .add-user-form h4 {
    margin: 0 0 0.75rem;
    font-size: 0.9rem;
    color: var(--color-text-muted);
  }

  .form-row {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .form-row input {
    flex: 1;
  }
</style>
