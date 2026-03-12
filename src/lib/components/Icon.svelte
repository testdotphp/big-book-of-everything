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
    User, Folder
  } from 'lucide-svelte';
  import type { ComponentType } from 'svelte';

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
  };

  let IconComponent = $derived(iconMap[name] || Box);
</script>

{#if IconComponent}
  <IconComponent {size} strokeWidth={1.75} />
{/if}
