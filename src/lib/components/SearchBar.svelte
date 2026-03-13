<script lang="ts">
  import { goto } from '$app/navigation';
  import { Search, X } from 'lucide-svelte';

  interface SearchResult {
    fieldName: string;
    value: string;
    categorySlug: string;
    categoryName: string;
    sectionSlug: string;
    sectionName: string;
  }

  let query = $state('');
  let results = $state<SearchResult[]>([]);
  let showResults = $state(false);
  let searching = $state(false);
  let debounceTimer: ReturnType<typeof setTimeout>;
  let inputEl: HTMLInputElement;

  function handleInput() {
    clearTimeout(debounceTimer);
    if (query.trim().length < 2) {
      results = [];
      showResults = false;
      return;
    }
    debounceTimer = setTimeout(doSearch, 250);
  }

  async function doSearch() {
    if (query.trim().length < 2) return;
    searching = true;
    try {
      const res = await fetch(`/api/book/search?q=${encodeURIComponent(query.trim())}`);
      if (res.ok) {
        const data = await res.json();
        results = data.results;
        showResults = true;
      }
    } catch {
      // ignore
    }
    searching = false;
  }

  function goToResult(result: SearchResult) {
    goto(`/book/${result.categorySlug}/${result.sectionSlug}`);
    clear();
  }

  function clear() {
    query = '';
    results = [];
    showResults = false;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') clear();
  }

  function handleBlur() {
    // Delay to allow click on result
    setTimeout(() => { showResults = false; }, 200);
  }

  // Global Ctrl+K / Cmd+K shortcut
  function handleGlobalKeydown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      inputEl?.focus();
    }
  }

  function highlight(text: string, q: string): string {
    if (!q.trim()) return text;
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return text.replace(new RegExp(`(${escaped})`, 'gi'), '<mark>$1</mark>');
  }
</script>

<svelte:window onkeydown={handleGlobalKeydown} />

<div class="search-container">
  <div class="search-input-wrap">
    <Search size={14} strokeWidth={2} />
    <input
      bind:this={inputEl}
      type="text"
      class="search-input"
      placeholder="Search...  (Ctrl+K)"
      bind:value={query}
      oninput={handleInput}
      onkeydown={handleKeydown}
      onfocus={() => { if (results.length > 0) showResults = true; }}
      onblur={handleBlur}
    />
    {#if query}
      <button class="search-clear" onclick={clear}>
        <X size={12} strokeWidth={2} />
      </button>
    {/if}
  </div>

  {#if showResults}
    <div class="search-results">
      {#if results.length === 0}
        <div class="search-empty">No results found</div>
      {:else}
        {#each results as result}
          <button class="search-result" onclick={() => goToResult(result)}>
            <div class="result-path">{result.categoryName} &rsaquo; {result.sectionName}</div>
            <div class="result-value">
              <span class="result-field">{result.fieldName}:</span>
              {@html highlight(result.value, query)}
            </div>
          </button>
        {/each}
      {/if}
    </div>
  {/if}
</div>

<style>
  .search-container {
    position: relative;
    padding: 8px 12px;
  }

  .search-input-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    padding: 6px 10px;
    color: var(--text-muted);
    transition: border-color 0.15s;
  }

  .search-input-wrap:focus-within {
    border-color: var(--theme-color);
  }

  .search-input {
    flex: 1;
    background: none;
    border: none;
    color: var(--text-primary);
    font-family: var(--font-body);
    font-size: 12.5px;
    outline: none;
    min-width: 0;
  }

  .search-input::placeholder {
    color: var(--text-muted);
  }

  .search-clear {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 2px;
    display: flex;
    border-radius: 50%;
    transition: color 0.15s;
  }

  .search-clear:hover {
    color: var(--text-primary);
  }

  .search-results {
    position: absolute;
    top: 100%;
    left: 12px;
    right: 12px;
    background: var(--bg-elevated);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
    max-height: 320px;
    overflow-y: auto;
    z-index: 300;
  }

  .search-empty {
    padding: 16px;
    text-align: center;
    font-size: 12.5px;
    color: var(--text-muted);
  }

  .search-result {
    display: block;
    width: 100%;
    padding: 8px 12px;
    background: none;
    border: none;
    text-align: left;
    cursor: pointer;
    transition: background 0.1s;
    border-bottom: 1px solid var(--border-subtle);
    font-family: var(--font-body);
  }

  .search-result:last-child {
    border-bottom: none;
  }

  .search-result:hover {
    background: var(--bg-hover);
  }

  .result-path {
    font-size: 10.5px;
    color: var(--text-muted);
    margin-bottom: 2px;
  }

  .result-value {
    font-size: 12.5px;
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .result-field {
    color: var(--text-secondary);
    font-weight: 500;
    margin-right: 4px;
  }

  .search-results :global(mark) {
    background: color-mix(in srgb, var(--theme-color) 30%, transparent);
    color: var(--text-primary);
    border-radius: 2px;
    padding: 0 1px;
  }
</style>
