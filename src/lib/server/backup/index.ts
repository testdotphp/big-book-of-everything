import type { BackupProvider, ProviderConfig } from './types';
import { createWebDAVProvider } from './webdav';
import { createDropboxProvider } from './dropbox';
import { createGoogleDriveProvider } from './google-drive';
import { createS3Provider } from './s3';
import { getDb } from '../db';
import { settings } from '../schema';
import { eq } from 'drizzle-orm';

export type { BackupProvider, ProviderConfig, BackupEntry } from './types';

export function getProvider(config: ProviderConfig): BackupProvider {
	switch (config.provider) {
		case 'webdav': return createWebDAVProvider(config);
		case 'dropbox': return createDropboxProvider(config);
		case 'google-drive': return createGoogleDriveProvider(config);
		case 's3': return createS3Provider(config);
		default: throw new Error(`Unknown provider: ${(config as any).provider}`);
	}
}

export function getSetting(key: string): string | null {
	const db = getDb();
	const row = db.select().from(settings).where(eq(settings.key, key)).get();
	return row?.value ?? null;
}

export function setSetting(key: string, value: string) {
	const db = getDb();
	const existing = db.select().from(settings).where(eq(settings.key, key)).get();
	if (existing) {
		db.update(settings).set({ value }).where(eq(settings.key, key)).run();
	} else {
		db.insert(settings).values({ key, value }).run();
	}
}

export function getProviderConfig(): ProviderConfig | null {
	const raw = getSetting('backup_config');
	if (!raw) return null;
	try {
		return JSON.parse(raw);
	} catch {
		return null;
	}
}

export function setProviderConfig(config: ProviderConfig) {
	setSetting('backup_config', JSON.stringify(config));
}
