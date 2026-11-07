import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createApp } from './create.mjs';

const distRoot = fileURLToPath(new URL('../dist/', import.meta.url));
const buildInfo = JSON.parse(await readFile(new URL('../dist/build-info.json', import.meta.url), 'utf8'));
const server = createApp({distRoot, buildInfo});
const port = Number(process.env.PORT || 8080);
server.listen(port, process.env.HOST || '127.0.0.1', () => console.log(`Quiz ${buildInfo.version}: port ${port}`));
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
for (const signal of ['SIGTERM','SIGINT']) process.on(signal, () => server.close(() => process.exit(0)));
