<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>Emergency Access | Big Book of Everything</title>
</svelte:head>

<div class="emergency-header">
  <h1>Big Book of Everything</h1>
  <p class="emergency-label">Emergency Read-Only Access — {data.tokenName}</p>
  <p class="emergency-date">Accessed {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</p>
</div>

<div class="emergency-content">
  {#each data.emergencyData as cat}
    {@const hasData = cat.sections.some(s =>
      s.keyValues?.some(kv => kv.value) || s.records?.length > 0
    )}
    {#if hasData}
      <div class="em-category">
        <h2>{cat.name}</h2>

        {#each cat.sections as sec}
          {@const secHasData = sec.type === 'key_value'
            ? sec.keyValues?.some(kv => kv.value)
            : (sec.records?.length ?? 0) > 0}
          {#if secHasData}
            <div class="em-section">
              <h3>{sec.name}</h3>

              {#if sec.type === 'key_value' && sec.keyValues}
                <table class="em-table kv">
                  {#each sec.keyValues.filter(kv => kv.value) as kv}
                    <tr>
                      <td class="kv-label">{kv.name}</td>
                      <td class="kv-value" class:hidden={kv.value === '[hidden]'}>{kv.value}</td>
                    </tr>
                  {/each}
                </table>
              {:else if sec.fields && sec.records}
                <table class="em-table">
                  <thead>
                    <tr>
                      {#each sec.fields as field}
                        <th>{field.name}</th>
                      {/each}
                    </tr>
                  </thead>
                  <tbody>
                    {#each sec.records as record}
                      <tr>
                        {#each sec.fields as field}
                          <td class:hidden={record.values[field.id] === '[hidden]'}>{record.values[field.id] || ''}</td>
                        {/each}
                      </tr>
                    {/each}
                  </tbody>
                </table>
              {/if}
            </div>
          {/if}
        {/each}
      </div>
    {/if}
  {/each}
</div>

<style>
  .emergency-header {
    margin-bottom: 32px;
  }

  .emergency-header h1 {
    font-family: var(--font-display);
    font-size: 24px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .emergency-label {
    font-size: 14px;
    color: var(--theme-color);
    font-weight: 500;
    margin-top: 4px;
  }

  .emergency-date {
    font-size: 13px;
    color: var(--text-muted);
    margin-top: 2px;
  }

  .emergency-content {
    max-width: 900px;
  }

  .em-category {
    margin-bottom: 32px;
  }

  .em-category h2 {
    font-family: var(--font-display);
    font-size: 20px;
    font-weight: 700;
    color: var(--text-primary);
    border-bottom: 2px solid var(--theme-color);
    padding-bottom: 6px;
    margin-bottom: 16px;
  }

  .em-section {
    margin-bottom: 20px;
  }

  .em-section h3 {
    font-family: var(--font-display);
    font-size: 15px;
    font-weight: 600;
    color: var(--text-secondary);
    margin-bottom: 8px;
  }

  .em-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12.5px;
  }

  .em-table th,
  .em-table td {
    padding: 6px 10px;
    border: 1px solid var(--border-color);
    text-align: left;
    color: var(--text-primary);
  }

  .em-table th {
    background: var(--bg-secondary);
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: var(--text-secondary);
  }

  .em-table.kv {
    max-width: 600px;
  }

  .kv-label {
    font-weight: 600;
    color: var(--text-secondary);
    white-space: nowrap;
    width: 200px;
  }

  .hidden {
    color: var(--text-muted);
    font-style: italic;
  }
</style>
