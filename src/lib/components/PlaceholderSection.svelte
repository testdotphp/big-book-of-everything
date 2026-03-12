<script lang="ts">
  import { Info, Upload, Download, Trash2, FileText, FileImage, File as FileIcon } from 'lucide-svelte';

  interface UploadedFile {
    id: number;
    filename: string;
    mimeType: string;
    size: number;
    uploadedAt: string;
  }

  interface Props {
    description: string;
    sectionId: number;
    files?: UploadedFile[];
  }

  let { description, sectionId, files: initialFiles = [] }: Props = $props();
  let files = $state<UploadedFile[]>(initialFiles);
  let uploading = $state(false);
  let dragOver = $state(false);
  let fileInput: HTMLInputElement;

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function getFileIcon(mimeType: string) {
    if (mimeType.startsWith('image/')) return FileImage;
    if (mimeType === 'application/pdf' || mimeType.startsWith('text/')) return FileText;
    return FileIcon;
  }

  async function uploadFiles(fileList: FileList | File[]) {
    uploading = true;
    for (const file of fileList) {
      const formData = new FormData();
      formData.append('sectionId', String(sectionId));
      formData.append('file', file);

      try {
        const res = await fetch('/api/book/uploads', { method: 'POST', body: formData });
        if (res.ok) {
          const uploaded = await res.json();
          files = [...files, uploaded];
        }
      } catch {
        // silently skip failed uploads
      }
    }
    uploading = false;
  }

  async function deleteFile(id: number) {
    const res = await fetch(`/api/book/uploads?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      files = files.filter(f => f.id !== id);
    }
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    dragOver = false;
    if (e.dataTransfer?.files.length) {
      uploadFiles(e.dataTransfer.files);
    }
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    dragOver = true;
  }

  function handleDragLeave() {
    dragOver = false;
  }

  function handleFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files?.length) {
      uploadFiles(input.files);
      input.value = '';
    }
  }
</script>

<div class="placeholder-card">
  <div class="placeholder-icon">
    <Info size={20} strokeWidth={1.75} />
  </div>
  <p class="placeholder-text">{description}</p>
</div>

<div
  class="upload-zone"
  class:drag-over={dragOver}
  role="button"
  tabindex="0"
  ondrop={handleDrop}
  ondragover={handleDragOver}
  ondragleave={handleDragLeave}
  onclick={() => fileInput.click()}
  onkeydown={(e) => { if (e.key === 'Enter') fileInput.click(); }}
>
  <Upload size={20} strokeWidth={1.75} />
  {#if uploading}
    <span>Uploading...</span>
  {:else}
    <span>Drop files here or click to upload</span>
  {/if}
  <span class="upload-hint">Max 10MB per file</span>
</div>

<input
  bind:this={fileInput}
  type="file"
  multiple
  class="hidden-input"
  onchange={handleFileSelect}
/>

{#if files.length > 0}
  <div class="file-list">
    {#each files as file}
      <div class="file-item">
        <div class="file-icon">
          <svelte:component this={getFileIcon(file.mimeType)} size={16} strokeWidth={1.75} />
        </div>
        <div class="file-info">
          <span class="file-name">{file.filename}</span>
          <span class="file-meta">{formatSize(file.size)} &middot; {formatDate(file.uploadedAt)}</span>
        </div>
        <a
          href="/api/book/uploads/download?id={file.id}"
          class="file-action"
          title="Download"
          onclick={(e) => e.stopPropagation()}
        >
          <Download size={14} strokeWidth={1.75} />
        </a>
        <button
          class="file-action delete"
          title="Delete"
          onclick={() => deleteFile(file.id)}
        >
          <Trash2 size={14} strokeWidth={1.75} />
        </button>
      </div>
    {/each}
  </div>
{/if}

<style>
  .placeholder-card {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    padding: 20px;
    background: color-mix(in srgb, var(--theme-color) 5%, var(--bg-secondary));
    border: 1px solid color-mix(in srgb, var(--theme-color) 15%, var(--border-color));
    border-radius: var(--radius-lg);
  }

  .placeholder-icon {
    color: var(--theme-color);
    flex-shrink: 0;
    margin-top: 1px;
  }

  .placeholder-text {
    font-size: 14px;
    line-height: 1.6;
    color: var(--text-secondary);
  }

  .upload-zone {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 32px;
    margin-top: 16px;
    border: 2px dashed var(--border-color);
    border-radius: var(--radius-lg);
    color: var(--text-muted);
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s, background 0.15s;
  }

  .upload-zone:hover {
    border-color: var(--theme-color);
    color: var(--theme-color);
  }

  .upload-zone.drag-over {
    border-color: var(--theme-color);
    color: var(--theme-color);
    background: color-mix(in srgb, var(--theme-color) 5%, transparent);
  }

  .upload-hint {
    font-size: 11px;
    opacity: 0.6;
  }

  .hidden-input {
    display: none;
  }

  .file-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-top: 16px;
  }

  .file-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
  }

  .file-icon {
    color: var(--text-muted);
    flex-shrink: 0;
  }

  .file-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .file-name {
    font-size: 13px;
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .file-meta {
    font-size: 11px;
    color: var(--text-muted);
  }

  .file-action {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 4px;
    border-radius: var(--radius-sm);
    display: inline-flex;
    transition: color 0.15s, background 0.15s;
  }

  .file-action:hover {
    background: var(--bg-hover);
    color: var(--theme-color);
  }

  .file-action.delete:hover {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
  }
</style>
