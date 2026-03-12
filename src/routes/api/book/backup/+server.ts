import { json, error, type RequestHandler } from '@sveltejs/kit';
import { getProvider, getProviderConfig, setProviderConfig, getSetting, setSetting } from '$lib/server/backup';
import type { ProviderConfig } from '$lib/server/backup';
import { env } from '$env/dynamic/private';
import { readFileSync } from 'fs';

// GET — get current config (redacted) + list cloud backups
export const GET: RequestHandler = async ({ url }) => {
	const action = url.searchParams.get('action');

	if (action === 'list') {
		const config = getProviderConfig();
		if (!config) return json({ backups: [] });

		try {
			const provider = getProvider(config);
			const backups = await provider.list();
			return json({ backups });
		} catch (err) {
			throw error(500, `Failed to list backups: ${(err as Error).message}`);
		}
	}

	// Default: return config summary
	const config = getProviderConfig();
	const lastBackup = getSetting('backup_last');

	if (!config) {
		return json({ configured: false, lastBackup: null });
	}

	// Redact sensitive fields
	const summary: Record<string, any> = { provider: config.provider, configured: true, lastBackup };
	switch (config.provider) {
		case 'webdav':
			summary.url = config.url;
			summary.path = config.path;
			summary.username = config.username;
			break;
		case 'dropbox':
			summary.path = config.path;
			summary.hasToken = !!config.accessToken;
			break;
		case 'google-drive':
			summary.folderId = config.folderId;
			summary.hasCredentials = !!(config.clientId && config.refreshToken);
			break;
		case 's3':
			summary.endpoint = config.endpoint;
			summary.bucket = config.bucket;
			summary.prefix = config.prefix;
			summary.region = config.region;
			break;
	}

	return json(summary);
};

// POST — save config, backup now, test connection, or restore
export const POST: RequestHandler = async ({ request, url }) => {
	const action = url.searchParams.get('action');

	if (action === 'config') {
		const config: ProviderConfig = await request.json();
		if (!config.provider) throw error(400, 'Provider is required');
		setProviderConfig(config);
		return json({ success: true });
	}

	if (action === 'test') {
		const config: ProviderConfig = await request.json();
		if (!config.provider) throw error(400, 'Provider is required');

		try {
			const provider = getProvider(config);
			const result = await provider.testConnection();
			return json(result);
		} catch (err) {
			return json({ ok: false, message: (err as Error).message });
		}
	}

	if (action === 'backup') {
		const config = getProviderConfig();
		if (!config) throw error(400, 'No backup provider configured');

		const format = url.searchParams.get('format') || 'json';
		const dbPath = env.BOOK_DB_PATH;
		if (!dbPath) throw error(500, 'Database path not configured');

		try {
			const provider = getProvider(config);
			const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

			if (format === 'sqlite') {
				const buffer = readFileSync(dbPath);
				const filename = `big-book-${timestamp}.db`;
				await provider.upload(Buffer.from(buffer), filename);
				setSetting('backup_last', new Date().toISOString());
				return json({ success: true, filename });
			} else {
				// Generate JSON export
				const exportRes = await fetch(`http://localhost:${getPort()}/api/book/export`);
				const jsonData = await exportRes.text();
				const filename = `big-book-${timestamp}.json`;
				await provider.upload(Buffer.from(jsonData), filename);
				setSetting('backup_last', new Date().toISOString());
				return json({ success: true, filename });
			}
		} catch (err) {
			throw error(500, `Backup failed: ${(err as Error).message}`);
		}
	}

	if (action === 'restore') {
		const config = getProviderConfig();
		if (!config) throw error(400, 'No backup provider configured');

		const { filename } = await request.json();
		if (!filename) throw error(400, 'Filename is required');

		try {
			const provider = getProvider(config);
			const buffer = await provider.download(filename);

			// Determine format from extension and call the import endpoint
			const format = filename.endsWith('.db') ? 'sqlite' : 'json';
			const importRes = await fetch(
				`http://localhost:${getPort()}/api/book/import?format=${format}`,
				{
					method: 'POST',
					headers: {
						'Content-Type': format === 'sqlite' ? 'application/octet-stream' : 'application/json'
					},
					body: new Uint8Array(buffer)
				}
			);

			if (!importRes.ok) throw new Error(`Import failed: ${importRes.status}`);
			return json({ success: true });
		} catch (err) {
			throw error(500, `Restore failed: ${(err as Error).message}`);
		}
	}

	throw error(400, 'Unknown action');
};

function getPort(): string {
	return env.PORT || '5173';
}
