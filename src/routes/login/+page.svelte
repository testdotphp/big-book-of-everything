<script lang="ts">
  import { goto } from '$app/navigation';
  import Icon from '$lib/components/Icon.svelte';
  import { toast } from '$lib/stores/toast';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  let portalName = data.config?.name || 'Portal';
  let portalIcon = data.config?.icon || 'home';
  let themeColor = data.config?.theme || '#4CAF50';

  // Local auth state
  let password = $state('');
  let username = $state('');
  let name = $state('');
  let error = $state('');
  let isSetup = $state(false);
  let loading = $state(false);
  let localAuthInfo = $state<{ enabled: boolean; mode: string; needsSetup: boolean } | null>(null);

  // Check local auth status on mount
  if (typeof window !== 'undefined' && data.localAuth) {
    fetch('/api/auth')
      .then(r => r.json())
      .then(d => {
        localAuthInfo = d;
        isSetup = d.needsSetup;
      })
      .catch(() => {});
  }

  async function handleLocalSubmit() {
    error = '';
    loading = true;
    try {
      const mode = localAuthInfo?.mode;
      let action: string;
      let body: Record<string, string>;

      if (mode === 'password') {
        action = isSetup ? 'setup' : 'login';
        body = { action, password };
      } else {
        action = isSetup ? 'register' : 'login';
        body = { action, username, password, name };
      }

      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Failed' }));
        error = data.error || 'Login failed';
        loading = false;
        return;
      }

      toast.success(isSetup ? 'Account created' : 'Signed in');
      goto('/', { replaceState: true });
    } catch {
      error = 'Request failed';
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Sign In | {portalName}</title>
</svelte:head>

<div class="login-page" style="--theme-color: {themeColor}">
  <div class="login-card">
    <div class="login-icon">
      <Icon name={portalIcon} size={28} />
    </div>
    <h1>Welcome to {portalName}</h1>

    {#if data.localAuth && localAuthInfo}
      <!-- Local auth: password or users mode -->
      {#if isSetup}
        <p>{localAuthInfo.mode === 'password' ? 'Set a password to protect your data.' : 'Create your account to get started.'}</p>
      {:else}
        <p>{localAuthInfo.mode === 'password' ? 'Enter your password to continue.' : 'Sign in with your account.'}</p>
      {/if}

      <form onsubmit={(e) => { e.preventDefault(); handleLocalSubmit(); }}>
        {#if localAuthInfo.mode === 'users'}
          {#if isSetup}
            <input
              type="text"
              class="login-input"
              placeholder="Display name"
              bind:value={name}
              autocomplete="name"
            />
          {/if}
          <input
            type="text"
            class="login-input"
            placeholder="Username"
            bind:value={username}
            autocomplete="username"
            autofocus
          />
        {/if}

        <input
          type="password"
          class="login-input"
          placeholder="Password"
          bind:value={password}
          autocomplete={isSetup ? 'new-password' : 'current-password'}
          autofocus={localAuthInfo.mode === 'password'}
        />

        {#if error}
          <div class="login-error">{error}</div>
        {/if}

        <button type="submit" class="login-btn" disabled={loading}>
          {#if loading}
            Signing in...
          {:else if isSetup}
            {localAuthInfo.mode === 'password' ? 'Set Password' : 'Create Account'}
          {:else}
            Sign in
          {/if}
        </button>
      </form>
    {:else}
      <!-- OIDC auth -->
      <p>Sign in with your account to continue.</p>
      <form method="POST" action="/auth/signin/oidc">
        <button type="submit" class="login-btn">
          Sign in
        </button>
      </form>
    {/if}
  </div>
</div>

<style>
  .login-page {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background: var(--bg-base, #0c0c14);
    padding: 24px;
  }

  .login-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    max-width: 380px;
    width: 100%;
    padding: 48px 40px;
    background: var(--bg-primary, #12121e);
    border: 1px solid var(--border-color, rgba(255, 255, 255, 0.06));
    border-radius: 16px;
    text-align: center;
  }

  .login-icon {
    width: 56px;
    height: 56px;
    border-radius: 14px;
    background: color-mix(in srgb, var(--theme-color) 10%, transparent);
    color: var(--theme-color);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 4px;
    border: 1px solid color-mix(in srgb, var(--theme-color) 15%, transparent);
  }

  h1 {
    font-family: var(--font-display, 'Plus Jakarta Sans', system-ui, sans-serif);
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.03em;
    color: var(--text-primary, #ececf1);
    line-height: 1.3;
  }

  p {
    font-family: var(--font-body, 'DM Sans', system-ui, sans-serif);
    font-size: 14px;
    color: var(--text-muted, #52525b);
    line-height: 1.5;
    margin-bottom: 8px;
  }

  form {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .login-input {
    width: 100%;
    padding: 12px 16px;
    background: var(--bg-secondary, #181828);
    border: 1px solid var(--border-color, rgba(255, 255, 255, 0.06));
    border-radius: 10px;
    color: var(--text-primary, #ececf1);
    font-family: var(--font-body, 'DM Sans', system-ui, sans-serif);
    font-size: 14px;
    outline: none;
    transition: border-color 0.15s;
    box-sizing: border-box;
  }

  .login-input:focus {
    border-color: var(--theme-color);
  }

  .login-input::placeholder {
    color: var(--text-muted, #52525b);
  }

  .login-error {
    font-size: 13px;
    color: #ef4444;
    text-align: left;
    padding: 0 4px;
  }

  .login-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 12px 24px;
    background: color-mix(in srgb, var(--theme-color) 12%, transparent);
    color: var(--theme-color);
    border: 1px solid color-mix(in srgb, var(--theme-color) 20%, transparent);
    border-radius: 10px;
    font-family: var(--font-display, 'Plus Jakarta Sans', system-ui, sans-serif);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
    margin-top: 4px;
  }

  .login-btn:hover {
    background: color-mix(in srgb, var(--theme-color) 20%, transparent);
    border-color: color-mix(in srgb, var(--theme-color) 35%, transparent);
  }

  .login-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>
