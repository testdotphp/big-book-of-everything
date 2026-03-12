import type { BackupProvider, BackupEntry, DropboxConfig } from './types';

export function createDropboxProvider(config: DropboxConfig): BackupProvider {
	const path = '/' + config.path.replace(/^\/|\/$/g, '');

	function authHeaders() {
		return { 'Authorization': `Bearer ${config.accessToken}` };
	}

	return {
		async upload(buffer: Buffer, filename: string) {
			const res = await fetch('https://content.dropboxapi.com/2/files/upload', {
				method: 'POST',
				headers: {
					...authHeaders(),
					'Content-Type': 'application/octet-stream',
					'Dropbox-API-Arg': JSON.stringify({
						path: `${path}/${filename}`,
						mode: 'overwrite',
						autorename: false
					})
				},
				body: new Uint8Array(buffer)
			});
			if (!res.ok) {
				const text = await res.text();
				throw new Error(`Dropbox upload failed: ${res.status} ${text}`);
			}
		},

		async download(filename: string) {
			const res = await fetch('https://content.dropboxapi.com/2/files/download', {
				method: 'POST',
				headers: {
					...authHeaders(),
					'Dropbox-API-Arg': JSON.stringify({ path: `${path}/${filename}` })
				}
			});
			if (!res.ok) throw new Error(`Dropbox download failed: ${res.status}`);
			return Buffer.from(await res.arrayBuffer());
		},

		async list() {
			const res = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
				method: 'POST',
				headers: { ...authHeaders(), 'Content-Type': 'application/json' },
				body: JSON.stringify({ path, limit: 100 })
			});

			if (!res.ok) {
				// Folder may not exist yet
				if (res.status === 409) return [];
				throw new Error(`Dropbox list failed: ${res.status}`);
			}

			const data = await res.json();
			const entries: BackupEntry[] = [];

			for (const entry of data.entries || []) {
				if (entry['.tag'] === 'file' && (entry.name.endsWith('.json') || entry.name.endsWith('.db'))) {
					entries.push({
						filename: entry.name,
						size: entry.size || 0,
						modified: entry.server_modified || ''
					});
				}
			}

			return entries.sort((a, b) => b.modified.localeCompare(a.modified));
		},

		async testConnection() {
			try {
				const res = await fetch('https://api.dropboxapi.com/2/users/get_current_account', {
					method: 'POST',
					headers: authHeaders()
				});
				if (res.ok) {
					const data = await res.json();
					return { ok: true, message: `Connected as ${data.name?.display_name || 'unknown'}` };
				}
				return { ok: false, message: `HTTP ${res.status}: Invalid or expired token` };
			} catch (err) {
				return { ok: false, message: `Connection failed: ${(err as Error).message}` };
			}
		}
	};
}
