import { writable } from 'svelte/store';

export interface Toast {
	id: number;
	message: string;
	type: 'success' | 'error' | 'info';
}

let nextId = 0;

function createToastStore() {
	const { subscribe, update } = writable<Toast[]>([]);

	function add(message: string, type: Toast['type'] = 'info', duration = 3000) {
		const id = nextId++;
		update((toasts) => [...toasts, { id, message, type }]);
		setTimeout(() => dismiss(id), duration);
	}

	function dismiss(id: number) {
		update((toasts) => toasts.filter((t) => t.id !== id));
	}

	return {
		subscribe,
		success: (msg: string) => add(msg, 'success'),
		error: (msg: string) => add(msg, 'error', 5000),
		info: (msg: string) => add(msg, 'info'),
		dismiss
	};
}

export const toast = createToastStore();
