import { deriveKey } from './crypto';

// In-memory encryption key — set when user unlocks, cleared on lock/restart
let encryptionKey: Buffer | null = null;

export function setEncryptionKey(password: string) {
	encryptionKey = deriveKey(password);
}

export function getEncryptionKey(): Buffer | null {
	return encryptionKey;
}

export function clearEncryptionKey() {
	encryptionKey = null;
}
