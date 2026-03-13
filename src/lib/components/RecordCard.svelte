<script lang="ts">
  import { enhance } from '$app/forms';
  import { ChevronDown, Trash2, Eye, EyeOff } from 'lucide-svelte';
  import ConfirmDialog from './ConfirmDialog.svelte';
  import { toast } from '$lib/stores/toast';

  interface Field {
    id: number;
    name: string;
    slug: string;
    fieldType: string;
    sortOrder: number;
    sensitive?: number;
  }

  interface RecordData {
    id: number;
    values: globalThis.Record<number, string>;
  }

  interface Props {
    record: RecordData;
    fields: Field[];
    index?: number;
  }

  let { record, fields, index = 0 }: Props = $props();
  let expanded = $state(index === 0);
  let revealed = $state<globalThis.Record<number, boolean>>({});
  let confirmDelete = $state(false);
  let deleteForm: HTMLFormElement;

  function toggleReveal(fieldId: number) {
    revealed[fieldId] = !revealed[fieldId];
  }

  function inputType(fieldType: string): string {
    switch (fieldType) {
      case 'number':
      case 'currency':
        return 'number';
      case 'date':
        return 'date';
      case 'phone':
        return 'tel';
      case 'email':
        return 'email';
      case 'url':
        return 'url';
      default:
        return 'text';
    }
  }

  function fieldSize(field: Field): 'sm' | 'md' | 'lg' | 'full' {
    const slug = field.slug;
    const type = field.fieldType;

    // Textarea and notes/address always full width
    if (type === 'textarea') return 'full';
    if (slug === 'notes' || slug === 'notes-results' || slug === 'notes-for-guardian') return 'full';

    // Short fields: dates, numbers, booleans, phone
    if (type === 'boolean' || type === 'date' || type === 'number' || type === 'currency') return 'sm';
    if (type === 'phone') return 'sm';

    // Address-like fields get more room
    if (slug.includes('address') || slug.includes('contents') || slug.includes('description')
      || slug.includes('details') || slug.includes('automated-payments')
      || slug.includes('beneficiaries') || slug.includes('pallbearers')
      || slug.includes('coverage') || slug.includes('items-explicitly')) return 'lg';

    return 'md';
  }

  let firstValue = $derived(record.values[fields[0]?.id] || '');
  let hasValue = $derived(firstValue.length > 0);
</script>

<div class="card" class:expanded>
  <div class="card-header">
    <button class="toggle-btn" onclick={() => expanded = !expanded}>
      <span class="chevron" class:rotated={expanded}>
        <ChevronDown size={16} strokeWidth={2} />
      </span>
      <span class="summary" class:placeholder={!hasValue}>{hasValue ? firstValue : 'Fill in fields below...'}</span>
    </button>
    <form
      bind:this={deleteForm}
      method="POST"
      action="?/deleteRecord"
      use:enhance={() => {
        return async ({ update }) => {
          toast.success('Record deleted');
          await update();
        };
      }}
    >
      <input type="hidden" name="recordId" value={record.id} />
      <button type="button" class="delete-btn" title="Delete record" onclick={() => confirmDelete = true}>
        <Trash2 size={14} strokeWidth={1.75} />
      </button>
    </form>
    <ConfirmDialog
      open={confirmDelete}
      title="Delete Record"
      message="Are you sure you want to delete this record? This cannot be undone."
      confirmLabel="Delete"
      destructive
      onconfirm={() => { confirmDelete = false; deleteForm.requestSubmit(); }}
      oncancel={() => confirmDelete = false}
    />
  </div>

  {#if expanded}
    <div class="card-body">
      {#each fields as field}
        <form
          method="POST"
          action="?/saveTableCell"
          use:enhance={() => {
            return async ({ update }) => {
              await update({ reset: false, invalidateAll: false });
            };
          }}
          class="field-row size-{fieldSize(field)}"
        >
          <input type="hidden" name="fieldId" value={field.id} />
          <input type="hidden" name="recordId" value={record.id} />
          <label class="field-label" for="card-{record.id}-{field.id}">{field.name}</label>
          {#if field.fieldType === 'textarea'}
            <textarea
              id="card-{record.id}-{field.id}"
              name="value"
              class="field-input textarea"
              value={record.values[field.id] || ''}
              onblur={(e) => e.currentTarget.form?.requestSubmit()}
              rows="2"
            ></textarea>
          {:else if field.fieldType === 'boolean'}
            <label class="field-toggle">
              <input
                type="checkbox"
                name="value"
                value="true"
                checked={record.values[field.id] === 'true'}
                onchange={(e) => e.currentTarget.form?.requestSubmit()}
              />
              <span>{record.values[field.id] === 'true' ? 'Yes' : 'No'}</span>
            </label>
          {:else}
            <div class="field-input-wrap">
              <input
                id="card-{record.id}-{field.id}"
                name="value"
                type={field.sensitive && !revealed[field.id] ? 'password' : inputType(field.fieldType)}
                class="field-input"
                class:has-reveal={field.sensitive}
                value={record.values[field.id] || ''}
                onblur={(e) => e.currentTarget.form?.requestSubmit()}
                step={field.fieldType === 'currency' ? '0.01' : undefined}
              />
              {#if field.sensitive}
                <button type="button" class="reveal-btn" onclick={() => toggleReveal(field.id)} title={revealed[field.id] ? 'Hide' : 'Reveal'}>
                  {#if revealed[field.id]}
                    <EyeOff size={12} strokeWidth={1.75} />
                  {:else}
                    <Eye size={12} strokeWidth={1.75} />
                  {/if}
                </button>
              {/if}
            </div>
          {/if}
        </form>
      {/each}
    </div>
  {/if}
</div>

<style>
  .card {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    overflow: hidden;
  }

  .card.expanded {
    border-color: color-mix(in srgb, var(--theme-color) 20%, var(--border-color));
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
  }

  .toggle-btn {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
    padding: 0;
    color: var(--text-primary);
  }

  .chevron {
    display: flex;
    color: var(--text-muted);
    transition: transform 0.15s;
  }

  .chevron.rotated {
    transform: rotate(180deg);
  }

  .summary {
    font-family: var(--font-display);
    font-size: 14px;
    font-weight: 600;
  }

  .summary.placeholder {
    color: var(--text-muted);
    font-weight: 400;
    font-style: italic;
  }

  .delete-btn {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 6px;
    border-radius: var(--radius-sm);
    display: inline-flex;
    transition: color 0.15s, background 0.15s;
    flex-shrink: 0;
  }

  .delete-btn:hover {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
  }

  .card-body {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 12px;
    padding: 0 16px 16px;
  }

  .field-row {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 4px 0;
    min-width: 0;
  }

  /* Small: date, number, currency, boolean, phone — ~3-4 per row */
  .field-row.size-sm {
    flex: 1 1 120px;
    max-width: 180px;
  }

  /* Medium: most text fields — ~2-3 per row */
  .field-row.size-md {
    flex: 2 1 200px;
  }

  /* Large: address, description, longer content — ~1-2 per row */
  .field-row.size-lg {
    flex: 3 1 300px;
  }

  /* Full width: textarea, notes */
  .field-row.size-full {
    flex: 1 1 100%;
  }

  .field-label {
    font-family: var(--font-display);
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text-muted);
  }

  .field-input {
    width: 100%;
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-family: var(--font-body);
    font-size: 13px;
    padding: 7px 10px;
    transition: border-color 0.15s;
    box-sizing: border-box;
  }

  .field-input:focus {
    outline: none;
    border-color: var(--theme-color);
  }

  .field-input.textarea {
    resize: vertical;
    min-height: 50px;
  }

  .field-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: var(--text-primary);
    cursor: pointer;
    padding: 7px 0;
  }

  .field-input-wrap {
    position: relative;
    width: 100%;
  }

  .field-input.has-reveal {
    padding-right: 30px;
  }

  .reveal-btn {
    position: absolute;
    right: 6px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 3px;
    border-radius: var(--radius-sm);
    display: flex;
    transition: color 0.15s;
  }

  .reveal-btn:hover {
    color: var(--text-primary);
  }

  @media (max-width: 480px) {
    .field-row.size-sm,
    .field-row.size-md,
    .field-row.size-lg {
      flex-basis: 100%;
      max-width: none;
    }
  }
</style>
