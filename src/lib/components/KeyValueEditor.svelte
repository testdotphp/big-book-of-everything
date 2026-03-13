<script lang="ts">
  import { enhance } from '$app/forms';
  import { Eye, EyeOff } from 'lucide-svelte';

  interface FieldWithValue {
    id: number;
    name: string;
    slug: string;
    fieldType: string;
    value: string;
    sensitive?: number;
  }

  interface Props {
    fields: FieldWithValue[];
  }

  let { fields }: Props = $props();
  let revealed = $state<Record<number, boolean>>({});

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
</script>

<div class="kv-editor">
  {#each fields as field}
    <form
      method="POST"
      action="?/saveKeyValue"
      use:enhance={() => {
        return async ({ update }) => {
          await update({ reset: false, invalidateAll: false });
        };
      }}
      class="kv-row"
    >
      <input type="hidden" name="fieldId" value={field.id} />
      <label class="kv-label" for="field-{field.id}">{field.name}</label>
      {#if field.fieldType === 'textarea'}
        <textarea
          id="field-{field.id}"
          name="value"
          class="kv-input textarea"
          value={field.value}
          onblur={(e) => e.currentTarget.form?.requestSubmit()}
          rows="3"
        ></textarea>
      {:else if field.fieldType === 'boolean'}
        <label class="kv-toggle">
          <input
            type="checkbox"
            name="value"
            value="true"
            checked={field.value === 'true'}
            onchange={(e) => e.currentTarget.form?.requestSubmit()}
          />
          <span>{field.value === 'true' ? 'Yes' : 'No'}</span>
        </label>
      {:else}
        <div class="kv-input-wrap">
          <input
            id="field-{field.id}"
            name="value"
            type={field.sensitive && !revealed[field.id] ? 'password' : inputType(field.fieldType)}
            class="kv-input"
            class:has-reveal={field.sensitive}
            value={field.value}
            onblur={(e) => e.currentTarget.form?.requestSubmit()}
            step={field.fieldType === 'currency' ? '0.01' : undefined}
          />
          {#if field.sensitive}
            <button type="button" class="reveal-btn" onclick={() => toggleReveal(field.id)} title={revealed[field.id] ? 'Hide' : 'Reveal'}>
              {#if revealed[field.id]}
                <EyeOff size={14} strokeWidth={1.75} />
              {:else}
                <Eye size={14} strokeWidth={1.75} />
              {/if}
            </button>
          {/if}
        </div>
      {/if}
    </form>
  {/each}
</div>

<style>
  .kv-editor {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .kv-row {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 12px 16px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    position: relative;
  }

  .kv-label {
    font-family: var(--font-display);
    font-size: 13px;
    font-weight: 600;
    color: var(--text-secondary);
    min-width: 160px;
    flex-shrink: 0;
  }

  .kv-input {
    flex: 1;
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-family: var(--font-body);
    font-size: 13px;
    padding: 8px 12px;
    transition: border-color 0.15s;
  }

  .kv-input:focus {
    outline: none;
    border-color: var(--theme-color);
  }

  .kv-input.textarea {
    resize: vertical;
    min-height: 60px;
  }

  .kv-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: var(--text-primary);
    cursor: pointer;
  }

  .kv-input-wrap {
    flex: 1;
    display: flex;
    align-items: center;
    position: relative;
  }

  .kv-input-wrap .kv-input {
    width: 100%;
  }

  .kv-input.has-reveal {
    padding-right: 36px;
  }

  .reveal-btn {
    position: absolute;
    right: 8px;
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 4px;
    border-radius: var(--radius-sm);
    display: flex;
    transition: color 0.15s;
  }

  .reveal-btn:hover {
    color: var(--text-primary);
  }
</style>
