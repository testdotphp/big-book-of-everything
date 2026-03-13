<script lang="ts">
  import { Printer } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  function maskValue(val: string): string {
    if (!val || val.length <= 2) return val;
    return val[0] + '*'.repeat(val.length - 2) + val[val.length - 1];
  }
</script>

<svelte:head>
  <title>Print | Big Book of Everything</title>
</svelte:head>

<div class="print-controls no-print">
  <button class="print-btn" onclick={() => window.print()}>
    <Printer size={16} strokeWidth={1.75} />
    Print Book
  </button>
  <a href="/book" class="back-link">Back to Book</a>
</div>

<div class="print-content">
  <h1 class="print-title">Big Book of Everything</h1>
  <p class="print-date">Printed {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</p>

  {#each data.printData as cat}
    {@const hasData = cat.sections.some(s =>
      s.keyValues?.some(kv => kv.value) || s.records?.length > 0
    )}
    {#if hasData}
      <div class="print-category">
        <h2>{cat.name}</h2>

        {#each cat.sections as sec}
          {@const secHasData = sec.type === 'key_value'
            ? sec.keyValues?.some(kv => kv.value)
            : (sec.records?.length ?? 0) > 0}
          {#if secHasData}
            <div class="print-section">
              <h3>{sec.name}</h3>

              {#if sec.type === 'key_value' && sec.keyValues}
                <table class="print-table kv">
                  {#each sec.keyValues.filter(kv => kv.value) as kv}
                    <tr>
                      <td class="kv-label">{kv.name}</td>
                      <td class="kv-value">{kv.sensitive ? maskValue(kv.value) : kv.value}</td>
                    </tr>
                  {/each}
                </table>
              {:else if sec.fields && sec.records}
                <table class="print-table">
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
                          <td>{field.sensitive ? maskValue(record.values[field.id] || '') : (record.values[field.id] || '')}</td>
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
  .no-print {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 24px;
  }

  .print-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    background: var(--theme-color);
    color: white;
    border: none;
    border-radius: var(--radius-md);
    font-family: var(--font-body);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
  }

  .back-link {
    font-size: 13px;
    color: var(--text-secondary);
  }

  .back-link:hover {
    color: var(--theme-color);
  }

  .print-content {
    max-width: 900px;
  }

  .print-title {
    font-family: var(--font-display);
    font-size: 28px;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 4px;
  }

  .print-date {
    font-size: 13px;
    color: var(--text-muted);
    margin-bottom: 32px;
  }

  .print-category {
    margin-bottom: 32px;
    break-inside: avoid;
  }

  .print-category h2 {
    font-family: var(--font-display);
    font-size: 20px;
    font-weight: 700;
    color: var(--text-primary);
    border-bottom: 2px solid var(--theme-color);
    padding-bottom: 6px;
    margin-bottom: 16px;
  }

  .print-section {
    margin-bottom: 20px;
    break-inside: avoid;
  }

  .print-section h3 {
    font-family: var(--font-display);
    font-size: 15px;
    font-weight: 600;
    color: var(--text-secondary);
    margin-bottom: 8px;
  }

  .print-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12.5px;
  }

  .print-table th,
  .print-table td {
    padding: 6px 10px;
    border: 1px solid var(--border-color);
    text-align: left;
    color: var(--text-primary);
  }

  .print-table th {
    background: var(--bg-secondary);
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: var(--text-secondary);
  }

  .print-table.kv {
    max-width: 600px;
  }

  .kv-label {
    font-weight: 600;
    color: var(--text-secondary);
    white-space: nowrap;
    width: 200px;
  }

  @media print {
    .no-print {
      display: none !important;
    }

    .print-title {
      font-size: 24pt;
      color: #000;
    }

    .print-date {
      color: #666;
    }

    .print-category h2 {
      font-size: 16pt;
      color: #000;
      border-bottom-color: #333;
    }

    .print-section h3 {
      font-size: 12pt;
      color: #333;
    }

    .print-table th,
    .print-table td {
      border-color: #ccc;
      color: #000;
    }

    .print-table th {
      background: #f0f0f0;
      color: #333;
    }

    .kv-label {
      color: #333;
    }
  }
</style>
