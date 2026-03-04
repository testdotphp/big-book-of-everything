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
  <span class="icon" class:active>
    <Icon name={item.icon} size={18} />
  </span>
  {#if !collapsed}
    <span class="label">{item.label}</span>
  {/if}
  {#if active && !collapsed}
    <span class="active-dot"></span>
  {/if}
</a>

<style>
  .nav-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 7px 12px;
    margin: 1px 8px;
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    font-family: var(--font-body);
    font-size: 13px;
    font-weight: 400;
    cursor: pointer;
    position: relative;
    transition: color 0.15s, background 0.15s;
  }

  .nav-item:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  .nav-item.active {
    background: color-mix(in srgb, var(--theme-color) 12%, transparent);
    color: var(--theme-color);
    font-weight: 500;
  }

  .nav-item.active:hover {
    background: color-mix(in srgb, var(--theme-color) 18%, transparent);
  }

  .nav-item.collapsed {
    justify-content: center;
    padding: 9px 0;
    margin: 1px 6px;
  }

  .icon {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    opacity: 0.7;
    transition: opacity 0.15s;
  }

  .nav-item:hover .icon {
    opacity: 1;
  }

  .icon.active {
    opacity: 1;
  }

  .label {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .active-dot {
    position: absolute;
    right: 10px;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--theme-color);
  }
</style>
