import type { BackupProvider, BackupEntry, WebDAVConfig } from './types';

export function createWebDAVProvider(config: WebDAVConfig): BackupProvider {
	const baseUrl = config.url.replace(/\/$/, '') + '/' + config.path.replace(/^\/|\/$/g, '');
	const headers = {
		'Authorization': 'Basic ' + Buffer.from(`${config.username}:${config.password}`).toString('base64')
	};

	async function ensureDirectory() {
		// MKCOL to create the directory (idempotent — 405 if exists)
		try {
			await fetch(baseUrl + '/', { method: 'MKCOL', headers });
		} catch {
			// Directory may already exist
		}
	}

	return {
		async upload(buffer: Buffer, filename: string) {
			await ensureDirectory();
			const res = await fetch(`${baseUrl}/${filename}`, {
				method: 'PUT',
				headers: { ...headers, 'Content-Type': 'application/octet-stream' },
				body: new Uint8Array(buffer)
			});
			if (!res.ok && res.status !== 201 && res.status !== 204) {
				throw new Error(`WebDAV upload failed: ${res.status} ${res.statusText}`);
			}
		},

		async download(filename: string) {
			const res = await fetch(`${baseUrl}/${filename}`, { method: 'GET', headers });
			if (!res.ok) throw new Error(`WebDAV download failed: ${res.status}`);
			return Buffer.from(await res.arrayBuffer());
		},

		async list() {
			const body = `<?xml version="1.0" encoding="UTF-8"?>
				<d:propfind xmlns:d="DAV:">
					<d:prop>
						<d:getcontentlength/>
						<d:getlastmodified/>
						<d:resourcetype/>
					</d:prop>
				</d:propfind>`;

			const res = await fetch(baseUrl + '/', {
				method: 'PROPFIND',
				headers: { ...headers, 'Content-Type': 'application/xml', 'Depth': '1' },
				body
			});

			if (!res.ok && res.status !== 207) return [];

			const xml = await res.text();
			const entries: BackupEntry[] = [];

			// Simple XML parsing for PROPFIND response
			const responses = xml.split('<d:response>').slice(1);
			for (const resp of responses) {
				const hrefMatch = resp.match(/<d:href>([^<]+)<\/d:href>/);
				const sizeMatch = resp.match(/<d:getcontentlength>(\d+)<\/d:getcontentlength>/);
				const dateMatch = resp.match(/<d:getlastmodified>([^<]+)<\/d:getlastmodified>/);
				const isDir = resp.includes('<d:collection');

				if (hrefMatch && !isDir) {
					const href = decodeURIComponent(hrefMatch[1]);
					const filename = href.split('/').filter(Boolean).pop() || '';
					if (filename.endsWith('.json') || filename.endsWith('.db')) {
						entries.push({
							filename,
							size: sizeMatch ? parseInt(sizeMatch[1]) : 0,
							modified: dateMatch ? dateMatch[1] : ''
						});
					}
				}
			}

			return entries.sort((a, b) => b.modified.localeCompare(a.modified));
		},

		async testConnection() {
			try {
				const res = await fetch(config.url.replace(/\/$/, '') + '/', {
					method: 'PROPFIND',
					headers: { ...headers, 'Depth': '0' }
				});
				if (res.ok || res.status === 207) {
					return { ok: true, message: 'Connected to WebDAV server' };
				}
				return { ok: false, message: `HTTP ${res.status}: ${res.statusText}` };
			} catch (err) {
				return { ok: false, message: `Connection failed: ${(err as Error).message}` };
			}
		}
	};
}
