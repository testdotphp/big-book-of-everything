import type { PageServerLoad, Actions } from './$types';
import { getProviderConfig, getSetting } from '$lib/server/backup';
import { getDb } from '$lib/server/db';
import { settings } from '$lib/server/schema';
import { eq, like } from 'drizzle-orm';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { env } from '$env/dynamic/private';
import { getLocalUsers } from '$lib/server/local-auth';

export const load: PageServerLoad = async () => {
	const config = getProviderConfig();
	const lastBackup = getSetting('backup_last');
	const db = getDb();
	const themeRow = db.select().from(settings).where(eq(settings.key, 'theme')).get();
	const fontSizeRow = db.select().from(settings).where(eq(settings.key, 'font_size')).get();

	// Load icon pack state
	const iconPackRow = db.select().from(settings).where(eq(settings.key, 'icon_pack')).get();
	const activeIconPack = iconPackRow?.value || 'lucide';

	// Get list of downloaded packs
	const downloadedRows = db.select().from(settings).where(like(settings.key, 'icon_pack_data:%')).all();
	const downloadedPacks = downloadedRows.map(r => r.key.replace('icon_pack_data:', ''));

	// Load registry
	let registry: { packs: { slug: string; name: string; description: string; preview: string[]; author: string; license: string }[] } = { packs: [] };
	const registryPath = resolve('configs/icon-registry.json');
	if (existsSync(registryPath)) {
		try { registry = JSON.parse(readFileSync(registryPath, 'utf-8')); } catch { /* ignore */ }
	}

	// Return config with sensitive fields redacted for display
	let displayConfig: Record<string, any> | null = null;
	if (config) {
		displayConfig = { ...config };
		// Redact secrets for the client
		if ('password' in displayConfig) displayConfig.password = displayConfig.password ? '••••••••' : '';
		if ('accessToken' in displayConfig) displayConfig.accessToken = displayConfig.accessToken ? '••••••••' : '';
		if ('clientSecret' in displayConfig) displayConfig.clientSecret = displayConfig.clientSecret ? '••••••••' : '';
		if ('refreshToken' in displayConfig) displayConfig.refreshToken = displayConfig.refreshToken ? '••••••••' : '';
		if ('secretAccessKey' in displayConfig) displayConfig.secretAccessKey = displayConfig.secretAccessKey ? '••••••••' : '';
	}

	const localAuthMode = env.LOCAL_AUTH?.toLowerCase() || null;
	const isUsersMode = localAuthMode === 'users';
	const users = isUsersMode ? getLocalUsers() : [];

	return {
		config: displayConfig,
		provider: config?.provider || null,
		lastBackup,
		theme: themeRow?.value || 'dark',
		fontSize: fontSizeRow?.value || 'medium',
		activeIconPack,
		downloadedPacks,
		iconRegistry: registry.packs,
		users,
		isUsersMode
	};
};

export const actions: Actions = {
	downloadIconPack: async ({ request }) => {
		const formData = await request.formData();
		const slug = String(formData.get('slug') || '');
		if (!slug) return { success: false };

		const packPath = resolve(`configs/icon-packs/${slug}.json`);
		if (!existsSync(packPath)) return { success: false, error: 'Pack not found' };

		const packData = readFileSync(packPath, 'utf-8');
		const db = getDb();
		const key = `icon_pack_data:${slug}`;
		const existing = db.select().from(settings).where(eq(settings.key, key)).get();
		if (existing) {
			db.update(settings).set({ value: packData }).where(eq(settings.key, key)).run();
		} else {
			db.insert(settings).values({ key, value: packData }).run();
		}

		return { success: true };
	},

	activateIconPack: async ({ request }) => {
		const formData = await request.formData();
		const slug = String(formData.get('slug') || 'lucide');
		const db = getDb();
		const existing = db.select().from(settings).where(eq(settings.key, 'icon_pack')).get();
		if (existing) {
			db.update(settings).set({ value: slug }).where(eq(settings.key, 'icon_pack')).run();
		} else {
			db.insert(settings).values({ key: 'icon_pack', value: slug }).run();
		}

		return { success: true };
	},

	removeIconPack: async ({ request }) => {
		const formData = await request.formData();
		const slug = String(formData.get('slug') || '');
		if (!slug || slug === 'lucide') return { success: false };

		const db = getDb();

		// If this pack is active, revert to Lucide
		const activeRow = db.select().from(settings).where(eq(settings.key, 'icon_pack')).get();
		if (activeRow?.value === slug) {
			db.update(settings).set({ value: 'lucide' }).where(eq(settings.key, 'icon_pack')).run();
		}

		// Delete the pack data
		db.delete(settings).where(eq(settings.key, `icon_pack_data:${slug}`)).run();

		return { success: true };
	},

	setTheme: async ({ request }) => {
		const formData = await request.formData();
		const theme = String(formData.get('theme') || 'dark');
		const validThemes = ['dark', 'light', 'nord', 'dracula', 'solarized-light'];
		if (!validThemes.includes(theme)) return { success: false };

		const db = getDb();
		const existing = db.select().from(settings).where(eq(settings.key, 'theme')).get();
		if (existing) {
			db.update(settings).set({ value: theme }).where(eq(settings.key, 'theme')).run();
		} else {
			db.insert(settings).values({ key: 'theme', value: theme }).run();
		}

		return { success: true, theme };
	},

	setFontSize: async ({ request }) => {
		const formData = await request.formData();
		const fontSize = String(formData.get('fontSize') || 'medium');
		const validSizes = ['small', 'medium', 'large'];
		if (!validSizes.includes(fontSize)) return { success: false };

		const db = getDb();
		const existing = db.select().from(settings).where(eq(settings.key, 'font_size')).get();
		if (existing) {
			db.update(settings).set({ value: fontSize }).where(eq(settings.key, 'font_size')).run();
		} else {
			db.insert(settings).values({ key: 'font_size', value: fontSize }).run();
		}

		return { success: true, fontSize };
	}
};
