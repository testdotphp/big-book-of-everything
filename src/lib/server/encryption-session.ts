import { deriveKey } from './crypto';

// In-memory encryption key — set when user unlocks, cleared on lock/restart.
// NOTE: This is a global singleton shared across all sessions/users.
// Suitable for single-user or household deployments. For multi-tenant use,
// this would need to be scoped per session.
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
