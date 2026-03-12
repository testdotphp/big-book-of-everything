import type { PageServerLoad } from './$types';
import { getProviderConfig, getSetting } from '$lib/server/backup';

export const load: PageServerLoad = async () => {
	const config = getProviderConfig();
	const lastBackup = getSetting('backup_last');

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
		lastBackup
	};
};
