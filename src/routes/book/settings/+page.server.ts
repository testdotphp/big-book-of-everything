import type { PageServerLoad, Actions } from './$types';
import { getProviderConfig, getSetting } from '$lib/server/backup';
import { getDb } from '$lib/server/db';
import { settings } from '$lib/server/schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	const config = getProviderConfig();
	const lastBackup = getSetting('backup_last');
	const db = getDb();
	const themeRow = db.select().from(settings).where(eq(settings.key, 'theme')).get();

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

	return {
		config: displayConfig,
		provider: config?.provider || null,
		lastBackup,
		theme: themeRow?.value || 'dark'
	};
};

export const actions: Actions = {
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
	}
};
