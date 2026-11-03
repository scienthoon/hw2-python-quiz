import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const dist = new URL('dist/', root);
const pkg = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await cp(new URL('public/', root), dist, { recursive: true });
await cp(new URL('src/', root), new URL('src/', dist), { recursive: true });
await writeFile(new URL('.nojekyll', dist), '');
await writeFile(new URL('build-info.json', dist), JSON.stringify({
  version: pkg.version,
  commit: process.env.GITHUB_SHA || 'local',
  builtAt: new Date().toISOString(),
}, null, 2) + '\n');
console.log(`Built v${pkg.version}: ${fileURLToPath(dist)}`);
