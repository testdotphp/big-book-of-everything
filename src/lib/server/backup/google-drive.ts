import type { BackupProvider, BackupEntry, GoogleDriveConfig } from './types';

async function getAccessToken(config: GoogleDriveConfig): Promise<string> {
	const res = await fetch('https://oauth2.googleapis.com/token', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			client_id: config.clientId,
			client_secret: config.clientSecret,
			refresh_token: config.refreshToken,
			grant_type: 'refresh_token'
		})
	});

	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Token refresh failed: ${res.status} ${text}`);
	}

	const data = await res.json();
	return data.access_token;
}

export function createGoogleDriveProvider(config: GoogleDriveConfig): BackupProvider {
	return {
		async upload(buffer: Buffer, filename: string) {
			const token = await getAccessToken(config);

			// Check if file already exists in folder
			const searchRes = await fetch(
				`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`name='${filename}' and '${config.folderId}' in parents and trashed=false`)}&fields=files(id)`,
				{ headers: { 'Authorization': `Bearer ${token}` } }
			);
			const searchData = await searchRes.json();
			const existingId = searchData.files?.[0]?.id;

			if (existingId) {
				// Update existing file
				const res = await fetch(
					`https://www.googleapis.com/upload/drive/v3/files/${existingId}?uploadType=media`,
					{
						method: 'PATCH',
						headers: {
							'Authorization': `Bearer ${token}`,
							'Content-Type': 'application/octet-stream'
						},
						body: new Uint8Array(buffer)
					}
				);
				if (!res.ok) throw new Error(`Google Drive update failed: ${res.status}`);
			} else {
				// Create new file with multipart upload
				const metadata = JSON.stringify({
					name: filename,
					parents: [config.folderId]
				});

				const boundary = '---BigBookBackup';
				const body = Buffer.concat([
					Buffer.from(
						`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: application/octet-stream\r\n\r\n`
					),
					buffer,
					Buffer.from(`\r\n--${boundary}--`)
				]);

				const res = await fetch(
					'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
					{
						method: 'POST',
						headers: {
							'Authorization': `Bearer ${token}`,
							'Content-Type': `multipart/related; boundary=${boundary}`
						},
						body: new Uint8Array(body)
					}
				);
				if (!res.ok) throw new Error(`Google Drive upload failed: ${res.status}`);
			}
		},

		async download(filename: string) {
			const token = await getAccessToken(config);

			const searchRes = await fetch(
				`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`name='${filename}' and '${config.folderId}' in parents and trashed=false`)}&fields=files(id)`,
				{ headers: { 'Authorization': `Bearer ${token}` } }
			);
			const searchData = await searchRes.json();
			const fileId = searchData.files?.[0]?.id;
			if (!fileId) throw new Error(`File "${filename}" not found in Google Drive`);

			const res = await fetch(
				`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
				{ headers: { 'Authorization': `Bearer ${token}` } }
			);
			if (!res.ok) throw new Error(`Google Drive download failed: ${res.status}`);
			return Buffer.from(await res.arrayBuffer());
		},

		async list() {
			const token = await getAccessToken(config);

			const res = await fetch(
				`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`'${config.folderId}' in parents and trashed=false`)}&fields=files(name,size,modifiedTime)&orderBy=modifiedTime desc&pageSize=50`,
				{ headers: { 'Authorization': `Bearer ${token}` } }
			);

			if (!res.ok) return [];
			const data = await res.json();

			return (data.files || [])
				.filter((f: any) => f.name.endsWith('.json') || f.name.endsWith('.db'))
				.map((f: any) => ({
					filename: f.name,
					size: parseInt(f.size || '0'),
					modified: f.modifiedTime || ''
				}));
		},

		async testConnection() {
			try {
				const token = await getAccessToken(config);
				const res = await fetch(
					`https://www.googleapis.com/drive/v3/files/${config.folderId}?fields=name`,
					{ headers: { 'Authorization': `Bearer ${token}` } }
				);
				if (res.ok) {
					const data = await res.json();
					return { ok: true, message: `Connected to folder "${data.name}"` };
				}
				return { ok: false, message: `HTTP ${res.status}: Check folder ID and permissions` };
			} catch (err) {
				return { ok: false, message: `Connection failed: ${(err as Error).message}` };
			}
		}
	};
}
