import { readFileSync } from 'fs';
import { env } from '$env/dynamic/private';
import type { PortalConfig } from '$lib/types';

let cachedConfig: PortalConfig | null = null;

export function getPortalConfig(): PortalConfig {
  if (cachedConfig) return cachedConfig;

  const configPath = env.PORTAL_CONFIG_PATH || '/app/portal.config.json';

  try {
    const raw = readFileSync(configPath, 'utf-8');
    cachedConfig = JSON.parse(raw) as PortalConfig;
    return cachedConfig;
  } catch (e) {
    throw new Error(`Failed to load portal config from ${configPath}: ${e}`);
  }
}
