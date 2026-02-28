<script lang="ts">
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
      <span>Loading {title}...</span>
    </div>
  {/if}

  {#if error}
    <div class="error-overlay">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
      <h3>Failed to load {title}</h3>
      <p>The application might be down or blocking iframe embedding.</p>
      <a href={url} target="_blank" rel="noopener noreferrer" class="open-link">
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
    background: #0a0a1a;
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
    background: var(--bg-secondary);
    color: var(--text-secondary);
    font-size: 14px;
    z-index: 10;
  }

  .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--border-color);
    border-top-color: var(--theme-color);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
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
    gap: 12px;
    background: var(--bg-secondary);
    color: var(--text-secondary);
  }

  .error-overlay h3 {
    color: #e57373;
    font-size: 18px;
  }

  .error-overlay p {
    font-size: 14px;
    color: var(--text-muted);
  }

  .open-link {
    margin-top: 8px;
    padding: 8px 20px;
    background: var(--bg-hover);
    color: var(--text-primary);
    border-radius: 6px;
    font-size: 13px;
    transition: background 0.15s;
  }

  .open-link:hover {
    background: var(--bg-active);
  }
</style>
