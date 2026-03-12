<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  let portalName = data.config?.name || 'Portal';
  let portalIcon = data.config?.icon || 'home';
  let themeColor = data.config?.theme || '#4CAF50';
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
    <p>Sign in with your account to continue.</p>
    <form method="POST" action="/auth/signin/oidc">
      <button type="submit" class="login-btn">
        Sign in
      </button>
    </form>
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
  }

  .login-btn:hover {
    background: color-mix(in srgb, var(--theme-color) 20%, transparent);
    border-color: color-mix(in srgb, var(--theme-color) 35%, transparent);
  }
</style>
