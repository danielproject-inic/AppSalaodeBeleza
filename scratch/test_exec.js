const { spawn } = require('child_process');
const path = require('path');

const exePath = path.join(__dirname, '../dist-electron/win-unpacked/Salon Suite Pro.exe');
console.log('Running executable:', exePath);

const child = spawn(exePath, [], {
  env: { ...process.env, ELECTRON_ENABLE_LOGGING: '1' }
});

child.stdout.on('data', (data) => {
  console.log('[STDOUT]:', data.toString());
});

child.stderr.on('data', (data) => {
  console.error('[STDERR]:', data.toString());
});

child.on('close', (code) => {
  console.log('[PROCESS CLOSED] Exit code:', code);
});
