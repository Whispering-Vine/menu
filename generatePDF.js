// Keep the historical entry point while running the shared TypeScript renderer.
const { spawnSync } = require('node:child_process');
const result = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/generate-menu.ts', ...process.argv.slice(2)], { stdio: 'inherit' });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
