<script lang="ts">
  import { ExternalLink, AlertCircle } from 'lucide-svelte';

  interface Props {
    url: string;
    title: string;
  }

  let { url, title }: Props = $props();
  let loading = $state(true);
  let error = $state(false);

  function onLoad() {
    loading = false;
  }

  function onError() {
    loading = false;
    error = true;
  }
</script>

<div class="iframe-container">
  {#if loading}
    <div class="loading-overlay">
      <div class="spinner"></div>
      <span class="loading-text">Loading {title}</span>
    </div>
  {/if}

  {#if error}
    <div class="error-overlay">
      <div class="error-icon">
        <AlertCircle size={40} strokeWidth={1.5} />
      </div>
      <h3>Failed to load {title}</h3>
      <p>The application might be down or blocking iframe embedding.</p>
      <a href={url} target="_blank" rel="noopener noreferrer" class="open-link">
        <ExternalLink size={14} strokeWidth={2} />
        Open in new tab
      </a>
    </div>
  {:else}
    <iframe
      src={url}
      {title}
      onload={onLoad}
      onerror={onError}
      sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
      allow="fullscreen"
    ></iframe>
  {/if}
</div>

<style>
  .iframe-container {
    width: 100%;
    height: 100%;
    position: relative;
    background: var(--bg-base);
  }

  iframe {
    width: 100%;
    height: 100%;
    border: none;
    display: block;
  }

  .loading-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    background: var(--bg-primary);
    z-index: 10;
  }

  .spinner {
    width: 28px;
    height: 28px;
    border: 2px solid var(--border-color);
    border-top-color: var(--theme-color);
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  .loading-text {
    font-family: var(--font-body);
    font-size: 13px;
    color: var(--text-muted);
    letter-spacing: 0.01em;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .error-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    background: var(--bg-primary);
  }

  .error-icon {
    color: var(--text-muted);
    margin-bottom: 4px;
  }

  .error-overlay h3 {
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 16px;
    color: var(--text-primary);
    letter-spacing: -0.01em;
  }

  .error-overlay p {
    font-size: 13px;
    color: var(--text-muted);
  }

  .open-link {
    margin-top: 8px;
    padding: 8px 18px;
    background: color-mix(in srgb, var(--theme-color) 12%, transparent);
    color: var(--theme-color);
    border-radius: var(--radius-md);
    font-family: var(--font-display);
    font-size: 13px;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: background 0.15s;
  }

  .open-link:hover {
    background: color-mix(in srgb, var(--theme-color) 20%, transparent);
  }
</style>
