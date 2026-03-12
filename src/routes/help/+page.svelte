<script lang="ts">
  import { ShieldCheck, Download, Monitor, Smartphone, Globe } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>Setup | {data.config?.name || 'Portal'}</title>
</svelte:head>

<div class="help-page">
  <div class="help-content">
    <div class="section">
      <div class="section-icon">
        <ShieldCheck size={24} strokeWidth={1.5} />
      </div>
      <h1>Setup</h1>
      <p class="subtitle">Install the network certificate to access all services without browser warnings.</p>
    </div>

    <div class="card">
      <h2>
        <Download size={18} strokeWidth={2} />
        Download Certificate
      </h2>
      <p>If your portal uses a custom CA for HTTPS, download and install the certificate to avoid browser warnings.</p>
      <a href="/api/ca-cert" class="download-btn">
        <Download size={16} strokeWidth={2} />
        Download CA Certificate
      </a>
    </div>

    <div class="card">
      <h2>
        <Globe size={18} strokeWidth={2} />
        Browser Installation
      </h2>

      <div class="instructions">
        <h3>
          <Monitor size={16} strokeWidth={2} />
          Chrome / Edge (Windows, Mac, Linux)
        </h3>
        <ol>
          <li>Download the certificate above</li>
          <li>Open <code>chrome://settings/certificates</code> (or <code>edge://settings/certificates</code>)</li>
          <li>Go to the <strong>Authorities</strong> tab</li>
          <li>Click <strong>Import</strong> and select the downloaded file</li>
          <li>Check <strong>"Trust this certificate for identifying websites"</strong></li>
          <li>Click OK</li>
        </ol>

        <h3>
          <Monitor size={16} strokeWidth={2} />
          Firefox (all platforms)
        </h3>
        <ol>
          <li>Download the certificate above</li>
          <li>Open <code>about:preferences#privacy</code></li>
          <li>Scroll to <strong>Certificates</strong> and click <strong>View Certificates</strong></li>
          <li>Go to the <strong>Authorities</strong> tab</li>
          <li>Click <strong>Import</strong> and select the downloaded file</li>
          <li>Check <strong>"Trust this CA to identify websites"</strong></li>
          <li>Click OK</li>
        </ol>

        <h3>
          <Monitor size={16} strokeWidth={2} />
          macOS (Safari / system-wide)
        </h3>
        <ol>
          <li>Download the certificate above</li>
          <li>Double-click the file to open it in Keychain Access</li>
          <li>Add it to the <strong>System</strong> keychain</li>
          <li>Find the certificate, double-click it</li>
          <li>Expand <strong>Trust</strong> and set to <strong>"Always Trust"</strong></li>
          <li>Close and enter your password to confirm</li>
        </ol>

        <h3>
          <Smartphone size={16} strokeWidth={2} />
          iOS / iPadOS
        </h3>
        <ol>
          <li>Open this page in Safari on your device</li>
          <li>Tap the download link above</li>
          <li>Go to <strong>Settings &gt; General &gt; VPN & Device Management</strong></li>
          <li>Tap the downloaded profile and install it</li>
          <li>Go to <strong>Settings &gt; General &gt; About &gt; Certificate Trust Settings</strong></li>
          <li>Enable full trust for the installed CA certificate</li>
        </ol>

        <h3>
          <Smartphone size={16} strokeWidth={2} />
          Android
        </h3>
        <ol>
          <li>Download the certificate above</li>
          <li>Go to <strong>Settings &gt; Security &gt; Encryption &amp; credentials</strong></li>
          <li>Tap <strong>Install a certificate &gt; CA certificate</strong></li>
          <li>Select the downloaded file</li>
          <li>Confirm installation</li>
        </ol>
      </div>
    </div>
  </div>
</div>

<style>
  .help-page {
    height: 100%;
    overflow-y: auto;
    background: var(--bg-base);
  }

  .help-content {
    max-width: 680px;
    margin: 0 auto;
    padding: 48px 24px 64px;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .section-icon {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: color-mix(in srgb, var(--theme-color) 10%, var(--bg-elevated));
    color: var(--theme-color);
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid color-mix(in srgb, var(--theme-color) 15%, transparent);
    margin-bottom: 4px;
  }

  h1 {
    font-family: var(--font-display);
    font-size: 24px;
    font-weight: 700;
    letter-spacing: -0.03em;
    color: var(--text-primary);
  }

  .subtitle {
    font-size: 14px;
    color: var(--text-muted);
    line-height: 1.5;
  }

  .card {
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .card h2 {
    font-family: var(--font-display);
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    gap: 8px;
    letter-spacing: -0.01em;
  }

  .card p {
    font-size: 13px;
    color: var(--text-muted);
    line-height: 1.6;
  }

  code {
    font-family: var(--font-mono);
    font-size: 12px;
    background: var(--bg-elevated);
    padding: 2px 6px;
    border-radius: 4px;
    color: var(--text-secondary);
  }

  .download-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    background: color-mix(in srgb, var(--theme-color) 12%, transparent);
    color: var(--theme-color);
    border-radius: var(--radius-md);
    font-family: var(--font-display);
    font-size: 13px;
    font-weight: 500;
    transition: background 0.15s;
    width: fit-content;
  }

  .download-btn:hover {
    background: color-mix(in srgb, var(--theme-color) 20%, transparent);
  }

  .instructions {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .instructions h3 {
    font-family: var(--font-display);
    font-size: 14px;
    font-weight: 600;
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 8px;
    padding-top: 12px;
    border-top: 1px solid var(--border-color);
  }

  .instructions h3:first-child {
    margin-top: 0;
    padding-top: 0;
    border-top: none;
  }

  ol {
    margin: 0;
    padding-left: 20px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  li {
    font-size: 13px;
    color: var(--text-secondary);
    line-height: 1.5;
  }

  li strong {
    color: var(--text-primary);
    font-weight: 500;
  }
</style>
