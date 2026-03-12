export interface BackupProvider {
	upload(buffer: Buffer, filename: string): Promise<void>;
	download(filename: string): Promise<Buffer>;
	list(): Promise<BackupEntry[]>;
	testConnection(): Promise<{ ok: boolean; message: string }>;
}

export interface BackupEntry {
	filename: string;
	size: number;
	modified: string;
}

export interface WebDAVConfig {
	provider: 'webdav';
	url: string;
	username: string;
	password: string;
	path: string; // e.g. /big-book-backups/
}

export interface DropboxConfig {
	provider: 'dropbox';
	accessToken: string;
	path: string; // e.g. /big-book-backups/
}

export interface GoogleDriveConfig {
	provider: 'google-drive';
	clientId: string;
	clientSecret: string;
	refreshToken: string;
	folderId: string;
}

export interface S3Config {
	provider: 's3';
	endpoint: string;
	region: string;
	bucket: string;
	accessKeyId: string;
	secretAccessKey: string;
	prefix: string; // e.g. big-book-backups/
}

export type ProviderConfig = WebDAVConfig | DropboxConfig | GoogleDriveConfig | S3Config;
