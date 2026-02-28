<script lang="ts">
  import type { NavItem as NavItemType } from '$lib/types';
  import Icon from './Icon.svelte';

  interface Props {
    item: NavItemType;
    active: boolean;
    collapsed: boolean;
  }

  let { item, active, collapsed }: Props = $props();
</script>

<a
  href="/app/{item.slug}"
  class="nav-item"
  class:active
  class:collapsed
  title={collapsed ? item.label : undefined}
>
  <span class="icon">
    <Icon name={item.icon} size={18} />
  </span>
  {#if !collapsed}
    <span class="label">{item.label}</span>
  {/if}
</a>

<style>
  .nav-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 14px;
    margin: 1px 6px;
    border-radius: 6px;
    color: var(--text-secondary);
    font-size: 13px;
    transition: all 0.15s ease;
    cursor: pointer;
  }

  .nav-item:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  .nav-item.active {
    background: var(--bg-active);
    color: white;
  }

  .nav-item.collapsed {
    justify-content: center;
    padding: 10px 0;
    margin: 1px 4px;
  }

  .icon {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 20px;
    height: 20px;
  }

  .label {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
