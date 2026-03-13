/**
 * Generate icon pack JSON files from the Iconify API.
 * Usage: node scripts/generate-icon-packs.cjs
 *
 * Fetches SVG data for all 54 app icons from each supported icon library
 * and writes configs/icon-packs/{slug}.json files.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// All 54 icon names used in the app
const APP_ICONS = [
  'users','file-text','dollar-sign','credit-card','shield','heart-pulse','scroll-text',
  'book-open','folder','home','settings','lock','user','star','globe','monitor','server',
  'database','smartphone','laptop','wrench','zap','wifi','cpu','router','hard-drive',
  'activity','bar-chart','gamepad-2','gauge','shield-alert','archive','box','eye-off',
  'search','download','play','film','tv','camera','headphones','youtube','message-circle',
  'clipboard','shopping-cart','package','utensils','kanban','check-circle','calendar',
  'layout','book','workflow','git-branch'
];

// Icon pack definitions: Iconify prefix + name mappings where they differ from Lucide
const PACKS = [
  {
    slug: 'phosphor',
    name: 'Phosphor',
    description: 'Clean, flexible icon family with consistent stroke weight',
    author: 'Phosphor Icons',
    license: 'MIT',
    prefix: 'ph',
    nameMap: {
      'file-text': 'file-text',
      'dollar-sign': 'currency-dollar',
      'credit-card': 'credit-card',
      'heart-pulse': 'heartbeat',
      'scroll-text': 'scroll',
      'book-open': 'book-open',
      'hard-drive': 'hard-drives',
      'bar-chart': 'chart-bar',
      'gamepad-2': 'game-controller',
      'shield-alert': 'shield-warning',
      'eye-off': 'eye-slash',
      'message-circle': 'chat-circle',
      'shopping-cart': 'shopping-cart',
      'check-circle': 'check-circle',
      'git-branch': 'git-branch',
      'kanban': 'kanban',
      'workflow': 'flow-arrow',
      'utensils': 'fork-knife',
      'youtube': 'youtube-logo',
      'tv': 'television',
      'film': 'film-strip'
    }
  },
  {
    slug: 'tabler',
    name: 'Tabler',
    description: 'Over 5000 pixel-perfect icons with 1.5px stroke',
    author: 'Tabler Icons',
    license: 'MIT',
    prefix: 'tabler',
    nameMap: {
      'dollar-sign': 'currency-dollar',
      'heart-pulse': 'heart-rate-monitor',
      'scroll-text': 'scroll',
      'hard-drive': 'server-2',
      'bar-chart': 'chart-bar',
      'gamepad-2': 'device-gamepad-2',
      'shield-alert': 'shield-exclamation',
      'eye-off': 'eye-off',
      'message-circle': 'message-circle',
      'shopping-cart': 'shopping-cart',
      'check-circle': 'circle-check',
      'kanban': 'layout-kanban',
      'workflow': 'topology-star-3',
      'utensils': 'tools-kitchen-2',
      'youtube': 'brand-youtube',
      'film': 'movie'
    }
  },
  {
    slug: 'heroicons',
    name: 'Heroicons',
    description: 'Beautiful hand-crafted icons by the Tailwind team',
    author: 'Tailwind Labs',
    license: 'MIT',
    prefix: 'heroicons',
    nameMap: {
      'users': 'user-group',
      'file-text': 'document-text',
      'dollar-sign': 'currency-dollar',
      'credit-card': 'credit-card',
      'heart-pulse': 'heart',
      'scroll-text': 'document',
      'book-open': 'book-open',
      'settings': 'cog-6-tooth',
      'hard-drive': 'server',
      'bar-chart': 'chart-bar',
      'gamepad-2': 'puzzle-piece',
      'gauge': 'chart-pie',
      'shield-alert': 'shield-exclamation',
      'eye-off': 'eye-slash',
      'message-circle': 'chat-bubble-oval-left',
      'shopping-cart': 'shopping-cart',
      'check-circle': 'check-circle',
      'kanban': 'view-columns',
      'workflow': 'arrows-right-left',
      'utensils': 'beaker',
      'youtube': 'play-circle',
      'film': 'film',
      'tv': 'tv',
      'headphones': 'speaker-wave',
      'git-branch': 'code-bracket',
      'activity': 'chart-bar-square',
      'router': 'signal',
      'clipboard': 'clipboard-document',
      'package': 'cube',
      'box': 'archive-box',
      'archive': 'archive-box',
      'smartphone': 'device-phone-mobile',
      'laptop': 'computer-desktop'
    }
  },
  {
    slug: 'feather',
    name: 'Feather',
    description: 'Simply beautiful open-source icons',
    author: 'Feather Icons',
    license: 'MIT',
    prefix: 'feather',
    nameMap: {
      'heart-pulse': 'heart',
      'scroll-text': 'file-text',
      'hard-drive': 'hard-drive',
      'bar-chart': 'bar-chart-2',
      'gamepad-2': 'crosshair',
      'gauge': 'activity',
      'shield-alert': 'shield-off',
      'kanban': 'columns',
      'workflow': 'git-merge',
      'utensils': 'coffee',
      'message-circle': 'message-circle',
      'check-circle': 'check-circle',
      'eye-off': 'eye-off',
      'git-branch': 'git-branch',
      'film': 'film',
      'youtube': 'youtube',
      'router': 'wifi'
    }
  },
  {
    slug: 'remix',
    name: 'Remix Icon',
    description: 'Neutral-style system icons for designers and developers',
    author: 'Remix Design',
    license: 'Apache 2.0',
    prefix: 'ri',
    nameMap: {
      'users': 'group-line',
      'user': 'user-line',
      'file-text': 'file-text-line',
      'dollar-sign': 'money-dollar-circle-line',
      'credit-card': 'bank-card-line',
      'shield': 'shield-line',
      'heart-pulse': 'heart-pulse-line',
      'scroll-text': 'scroll-to-bottom-line',
      'book-open': 'book-open-line',
      'folder': 'folder-line',
      'home': 'home-line',
      'settings': 'settings-3-line',
      'lock': 'lock-line',
      'star': 'star-line',
      'globe': 'global-line',
      'monitor': 'computer-line',
      'server': 'server-line',
      'database': 'database-2-line',
      'smartphone': 'smartphone-line',
      'laptop': 'macbook-line',
      'wrench': 'tools-line',
      'zap': 'flashlight-line',
      'wifi': 'wifi-line',
      'cpu': 'cpu-line',
      'router': 'router-line',
      'hard-drive': 'hard-drive-2-line',
      'activity': 'pulse-line',
      'bar-chart': 'bar-chart-line',
      'gamepad-2': 'gamepad-line',
      'gauge': 'dashboard-line',
      'shield-alert': 'shield-check-line',
      'archive': 'archive-line',
      'box': 'box-3-line',
      'eye-off': 'eye-off-line',
      'search': 'search-line',
      'download': 'download-line',
      'play': 'play-line',
      'film': 'film-line',
      'tv': 'tv-line',
      'camera': 'camera-line',
      'headphones': 'headphone-line',
      'youtube': 'youtube-line',
      'message-circle': 'message-3-line',
      'clipboard': 'clipboard-line',
      'shopping-cart': 'shopping-cart-line',
      'package': 'box-1-line',
      'utensils': 'restaurant-line',
      'kanban': 'layout-column-line',
      'check-circle': 'checkbox-circle-line',
      'calendar': 'calendar-line',
      'layout': 'layout-line',
      'book': 'book-line',
      'workflow': 'flow-chart',
      'git-branch': 'git-branch-line'
    }
  },
  {
    slug: 'bootstrap',
    name: 'Bootstrap Icons',
    description: 'Official open-source icon library for Bootstrap',
    author: 'Bootstrap',
    license: 'MIT',
    prefix: 'bi',
    nameMap: {
      'users': 'people',
      'user': 'person',
      'file-text': 'file-text',
      'dollar-sign': 'currency-dollar',
      'credit-card': 'credit-card',
      'heart-pulse': 'heart-pulse',
      'scroll-text': 'file-earmark-text',
      'book-open': 'book',
      'settings': 'gear',
      'hard-drive': 'hdd',
      'bar-chart': 'bar-chart',
      'gamepad-2': 'controller',
      'gauge': 'speedometer',
      'shield-alert': 'shield-exclamation',
      'eye-off': 'eye-slash',
      'message-circle': 'chat',
      'shopping-cart': 'cart',
      'check-circle': 'check-circle',
      'kanban': 'kanban',
      'workflow': 'diagram-3',
      'utensils': 'cup-hot',
      'youtube': 'youtube',
      'film': 'film',
      'git-branch': 'git',
      'smartphone': 'phone',
      'laptop': 'laptop',
      'clipboard': 'clipboard',
      'package': 'box',
      'box': 'box2',
      'archive': 'archive',
      'router': 'router',
      'activity': 'activity'
    }
  },
  {
    slug: 'material',
    name: 'Material Symbols',
    description: 'Google\'s latest icon set with optical sizing',
    author: 'Google',
    license: 'Apache 2.0',
    prefix: 'material-symbols',
    nameMap: {
      'users': 'group-outline-rounded',
      'user': 'person-outline-rounded',
      'file-text': 'description-outline-rounded',
      'dollar-sign': 'attach-money-rounded',
      'credit-card': 'credit-card-outline-rounded',
      'shield': 'shield-outline-rounded',
      'heart-pulse': 'monitor-heart-outline-rounded',
      'scroll-text': 'article-outline-rounded',
      'book-open': 'menu-book-outline-rounded',
      'folder': 'folder-outline-rounded',
      'home': 'home-outline-rounded',
      'settings': 'settings-outline-rounded',
      'lock': 'lock-outline-rounded',
      'star': 'star-outline-rounded',
      'globe': 'language-rounded',
      'monitor': 'monitor-outline-rounded',
      'server': 'dns-outline-rounded',
      'database': 'database-outline-rounded',
      'smartphone': 'smartphone-outline-rounded',
      'laptop': 'laptop-mac-outline-rounded',
      'wrench': 'build-outline-rounded',
      'zap': 'bolt-outline-rounded',
      'wifi': 'wifi-rounded',
      'cpu': 'memory-outline-rounded',
      'router': 'router-outline-rounded',
      'hard-drive': 'hard-drive-outline-rounded',
      'activity': 'monitoring-outline-rounded',
      'bar-chart': 'bar-chart-outline-rounded',
      'gamepad-2': 'sports-esports-outline-rounded',
      'gauge': 'speed-outline-rounded',
      'shield-alert': 'gpp-maybe-outline-rounded',
      'archive': 'archive-outline-rounded',
      'box': 'package-2-outline-rounded',
      'eye-off': 'visibility-off-outline-rounded',
      'search': 'search-rounded',
      'download': 'download-outline-rounded',
      'play': 'play-arrow-outline-rounded',
      'film': 'movie-outline-rounded',
      'tv': 'tv-outline-rounded',
      'camera': 'photo-camera-outline-rounded',
      'headphones': 'headphones-outline-rounded',
      'youtube': 'smart-display-outline-rounded',
      'message-circle': 'chat-bubble-outline-rounded',
      'clipboard': 'content-paste-outline-rounded',
      'shopping-cart': 'shopping-cart-outline-rounded',
      'package': 'inventory-2-outline-rounded',
      'utensils': 'restaurant-outline-rounded',
      'kanban': 'view-kanban-outline-rounded',
      'check-circle': 'check-circle-outline-rounded',
      'calendar': 'calendar-today-outline-rounded',
      'layout': 'dashboard-outline-rounded',
      'book': 'book-outline-rounded',
      'workflow': 'account-tree-outline-rounded',
      'git-branch': 'fork-right-outline-rounded'
    }
  },
  {
    slug: 'ionicons',
    name: 'Ionicons',
    description: 'Premium designed icons for Ionic Framework',
    author: 'Ionic',
    license: 'MIT',
    prefix: 'ion',
    nameMap: {
      'users': 'people-outline',
      'user': 'person-outline',
      'file-text': 'document-text-outline',
      'dollar-sign': 'cash-outline',
      'credit-card': 'card-outline',
      'shield': 'shield-outline',
      'heart-pulse': 'heart-outline',
      'scroll-text': 'reader-outline',
      'book-open': 'book-outline',
      'folder': 'folder-outline',
      'home': 'home-outline',
      'settings': 'settings-outline',
      'lock': 'lock-closed-outline',
      'star': 'star-outline',
      'globe': 'globe-outline',
      'monitor': 'desktop-outline',
      'server': 'server-outline',
      'database': 'server-outline',
      'smartphone': 'phone-portrait-outline',
      'laptop': 'laptop-outline',
      'wrench': 'build-outline',
      'zap': 'flash-outline',
      'wifi': 'wifi-outline',
      'cpu': 'hardware-chip-outline',
      'router': 'git-network-outline',
      'hard-drive': 'albums-outline',
      'activity': 'pulse-outline',
      'bar-chart': 'bar-chart-outline',
      'gamepad-2': 'game-controller-outline',
      'gauge': 'speedometer-outline',
      'shield-alert': 'shield-checkmark-outline',
      'archive': 'archive-outline',
      'box': 'cube-outline',
      'eye-off': 'eye-off-outline',
      'search': 'search-outline',
      'download': 'download-outline',
      'play': 'play-outline',
      'film': 'film-outline',
      'tv': 'tv-outline',
      'camera': 'camera-outline',
      'headphones': 'headset-outline',
      'youtube': 'logo-youtube',
      'message-circle': 'chatbubble-outline',
      'clipboard': 'clipboard-outline',
      'shopping-cart': 'cart-outline',
      'package': 'cube-outline',
      'utensils': 'restaurant-outline',
      'kanban': 'grid-outline',
      'check-circle': 'checkmark-circle-outline',
      'calendar': 'calendar-outline',
      'layout': 'apps-outline',
      'book': 'book-outline',
      'workflow': 'git-merge-outline',
      'git-branch': 'git-branch-outline'
    }
  }
];

function fetch(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'icon-pack-generator' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetch(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', reject);
  });
}

async function generatePack(pack) {
  // Build the list of iconify names to fetch
  const iconNames = APP_ICONS.map(name => pack.nameMap[name] || name);
  const uniqueNames = [...new Set(iconNames)];

  // Fetch in batches of 20
  const allIcons = {};
  for (let i = 0; i < uniqueNames.length; i += 20) {
    const batch = uniqueNames.slice(i, i + 20);
    const url = `https://api.iconify.design/${pack.prefix}.json?icons=${batch.join(',')}`;
    try {
      const res = await fetch(url);
      if (res.status === 200) {
        const json = JSON.parse(res.data);
        if (json.icons) {
          Object.assign(allIcons, json.icons);
        }
      }
    } catch (err) {
      console.error(`  Error fetching batch for ${pack.slug}:`, err.message);
    }
  }

  // Build the icon mapping
  const defaultWidth = 24;
  const defaultHeight = 24;
  const icons = {};
  let found = 0;
  let missing = 0;

  for (const appName of APP_ICONS) {
    const iconifyName = pack.nameMap[appName] || appName;
    const iconData = allIcons[iconifyName];
    if (iconData) {
      const w = iconData.width || defaultWidth;
      const h = iconData.height || defaultHeight;
      icons[appName] = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" fill="none" stroke="currentColor" stroke-width="0" stroke-linecap="round" stroke-linejoin="round">${iconData.body}</svg>`;
      found++;
    } else {
      missing++;
    }
  }

  console.log(`  ${pack.name}: ${found} found, ${missing} missing`);

  const packData = {
    name: pack.name,
    slug: pack.slug,
    description: pack.description,
    author: pack.author,
    license: pack.license,
    version: '1.0',
    iconCount: found,
    totalIcons: APP_ICONS.length,
    icons
  };

  const outPath = path.join(__dirname, '..', 'configs', 'icon-packs', `${pack.slug}.json`);
  fs.writeFileSync(outPath, JSON.stringify(packData, null, 2));
  return { slug: pack.slug, found, missing };
}

async function main() {
  console.log('Generating icon packs...\n');
  const results = [];

  for (const pack of PACKS) {
    const result = await generatePack(pack);
    results.push(result);
  }

  console.log('\nDone! Generated packs:');
  for (const r of results) {
    console.log(`  ${r.slug}: ${r.found}/${r.found + r.missing} icons`);
  }
}

main().catch(console.error);
