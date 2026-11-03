import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const dist = new URL('dist/', root);
const pkg = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await cp(new URL('public/', root), dist, { recursive: true });
await cp(new URL('src/', root), new URL('src/', dist), { recursive: true });
// Version every asset and module import so a new deployment does not keep
// executing an older browser-cached entrypoint or dependency.
const htmlPath = new URL('index.html', dist);
const html = await readFile(htmlPath, 'utf8');
await writeFile(htmlPath, html.replace(/(\.\/styles\.css|\.\/favicon\.svg|\.\/src\/app\.mjs)(?=")/g, `$1?v=${pkg.version}`));
for (const name of await readdir(new URL('src/', dist))) {
  if (!name.endsWith('.mjs')) continue;
  const path = new URL(`src/${name}`, dist);
  const source = await readFile(path, 'utf8');
  await writeFile(path, source.replace(/(from\s+['"])(\.\/[^'"?]+\.mjs)(['"])/g, `$1$2?v=${pkg.version}$3`));
}
await writeFile(new URL('.nojekyll', dist), '');
await writeFile(new URL('build-info.json', dist), JSON.stringify({
  version: pkg.version,
  commit: process.env.GITHUB_SHA || 'local',
  builtAt: new Date().toISOString(),
}, null, 2) + '\n');
console.log(`Built v${pkg.version}: ${fileURLToPath(dist)}`);
