const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const stagingDir = path.join(root, '.electron-staging');

// Clean previous staging
if (fs.existsSync(stagingDir)) {
  fs.rmSync(stagingDir, { recursive: true });
}
fs.mkdirSync(stagingDir, { recursive: true });

// Copy package files — remove "type": "module" so staging dir uses CommonJS
// (required for @electron/rebuild CLI compatibility)
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf-8'));
delete pkg.type;
fs.writeFileSync(path.join(stagingDir, 'package.json'), JSON.stringify(pkg, null, 2));

if (fs.existsSync(path.join(root, 'package-lock.json'))) {
  fs.copyFileSync(
    path.join(root, 'package-lock.json'),
    path.join(stagingDir, 'package-lock.json')
  );
}

// Install production dependencies only
console.log('Installing production dependencies...');
execFileSync('npm', ['ci', '--omit=dev', '--legacy-peer-deps'], {
  cwd: stagingDir,
  stdio: 'inherit'
});

// Rebuild better-sqlite3 for Electron using the programmatic API
// (the CLI fails in ESM projects due to yargs requiring CommonJS)
console.log('Rebuilding native modules for Electron...');
const electronVersion = require('electron/package.json').version;
execFileSync(process.execPath, [
  '--input-type=commonjs',
  '-e',
  `const { rebuild } = require('@electron/rebuild');
   rebuild({
     buildPath: process.argv[1],
     electronVersion: process.argv[2],
     onlyModules: ['better-sqlite3'],
     force: true
   }).then(() => console.log('Rebuild complete'))
     .catch(err => { console.error(err); process.exit(1); });`,
  stagingDir,
  electronVersion
], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, NODE_PATH: path.join(root, 'node_modules') }
});

// Create a minimal package.json for the server directory with "type": "module"
// so Node.js correctly interprets the SvelteKit ESM build output
fs.writeFileSync(
  path.join(stagingDir, 'server-package.json'),
  JSON.stringify({ type: 'module' }, null, 2)
);

console.log('Staging complete. Production node_modules ready at .electron-staging/');
