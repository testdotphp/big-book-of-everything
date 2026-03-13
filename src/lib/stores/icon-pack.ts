import { writable } from 'svelte/store';

// Holds the active icon pack's SVG map (null = use built-in Lucide)
export const iconPackData = writable<Record<string, string> | null>(null);
