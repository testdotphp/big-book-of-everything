<script lang="ts">
  import {
    Home, Layout, CheckCircle, Calendar, Star, Kanban,
    Utensils, Package, ShoppingCart, FileText, Clipboard,
    DollarSign, Camera, Play, MessageCircle, Tv, Film,
    Search, Download, HardDrive, Zap, BookOpen, Book,
    Headphones, Youtube, EyeOff, BarChart3, Activity,
    Globe, GitBranch, Shield, ShieldAlert, Lock, Wifi,
    Box, ScrollText, Cpu, Router, Wrench, Workflow,
    Database, Monitor, Server, Settings, Archive,
    Gamepad2, Gauge, HeartPulse, Laptop, Smartphone,
    User, Folder, Users, CreditCard
  } from 'lucide-svelte';
  import type { ComponentType } from 'svelte';
  import { iconPackData } from '$lib/stores/icon-pack';

  interface Props {
    name: string;
    size?: number;
  }

  let { name, size = 18 }: Props = $props();

  const iconMap: Record<string, ComponentType> = {
    'home': Home,
    'layout': Layout,
    'check-circle': CheckCircle,
    'calendar': Calendar,
    'star': Star,
    'kanban': Kanban,
    'utensils': Utensils,
    'package': Package,
    'shopping-cart': ShoppingCart,
    'file-text': FileText,
    'clipboard': Clipboard,
    'dollar-sign': DollarSign,
    'camera': Camera,
    'play': Play,
    'message-circle': MessageCircle,
    'tv': Tv,
    'film': Film,
    'search': Search,
    'download': Download,
    'hard-drive': HardDrive,
    'zap': Zap,
    'book-open': BookOpen,
    'book': Book,
    'headphones': Headphones,
    'youtube': Youtube,
    'eye-off': EyeOff,
    'bar-chart': BarChart3,
    'activity': Activity,
    'globe': Globe,
    'git-branch': GitBranch,
    'shield': Shield,
    'lock': Lock,
    'wifi': Wifi,
    'box': Box,
    'scroll-text': ScrollText,
    'cpu': Cpu,
    'router': Router,
    'wrench': Wrench,
    'workflow': Workflow,
    'database': Database,
    'monitor': Monitor,
    'server': Server,
    'settings': Settings,
    'archive': Archive,
    'gamepad-2': Gamepad2,
    'gauge': Gauge,
    'heart-pulse': HeartPulse,
    'laptop': Laptop,
    'shield-alert': ShieldAlert,
    'smartphone': Smartphone,
    'user': User,
    'folder': Folder,
    'users': Users,
    'credit-card': CreditCard,
  };

  // Check if the active icon pack has this icon as custom SVG
  let customSvg = $derived($iconPackData?.[name] || null);
  let IconComponent = $derived(iconMap[name] || Box);
</script>

{#if customSvg}
  <span class="custom-icon" style="width: {size}px; height: {size}px;">
    {@html customSvg}
  </span>
{:else if IconComponent}
  <IconComponent {size} strokeWidth={1.75} />
{/if}

<style>
  .custom-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    line-height: 0;
  }

  .custom-icon :global(svg) {
    width: 100%;
    height: 100%;
    color: currentColor;
  }
</style>
