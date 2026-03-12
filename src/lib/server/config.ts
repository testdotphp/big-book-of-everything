import { readFileSync, existsSync } from 'fs';
import { env } from '$env/dynamic/private';
import type { PortalConfig } from '$lib/types';

let cachedConfig: PortalConfig | null = null;

const defaultConfig: PortalConfig = {
  name: 'Portal',
  icon: 'home',
  theme: '#4CAF50',
  items: []
};

export function getPortalConfig(): PortalConfig {
  if (cachedConfig) return cachedConfig;

  const configPath = env.PORTAL_CONFIG_PATH || 'portal.config.json';

  if (!existsSync(configPath)) {
    cachedConfig = defaultConfig;
    return cachedConfig;
  }

  try {
    const raw = readFileSync(configPath, 'utf-8');
    cachedConfig = JSON.parse(raw) as PortalConfig;
    return cachedConfig;
  } catch (e) {
    console.warn(`Failed to load portal config from ${configPath}: ${e}`);
    cachedConfig = defaultConfig;
    return cachedConfig;
  }
}
