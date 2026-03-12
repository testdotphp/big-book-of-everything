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

// Copy package files
fs.copyFileSync(
  path.join(root, 'package.json'),
  path.join(stagingDir, 'package.json')
);
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

// Rebuild better-sqlite3 for Electron
console.log('Rebuilding native modules for Electron...');
execFileSync('npx', ['@electron/rebuild', '-f', '-w', 'better-sqlite3'], {
  cwd: stagingDir,
  stdio: 'inherit'
});

console.log('Staging complete. Production node_modules ready at .electron-staging/');
